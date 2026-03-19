// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AdvancedBallot
 * @dev Advanced ballot contract supporting single/multi-choice voting, encryption, and revocation
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract AdvancedBallot is AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;

    // ============= ROLES =============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VOTER_ROLE = keccak256("VOTER_ROLE");

    // ============= ENUMS =============
    enum BallotType { SINGLE_CHOICE, MULTI_CHOICE, RANKING }
    enum BallotStatus { OPEN, CLOSED, FINALIZED }

    // ============= STRUCTS =============
    struct Option {
        uint256 id;
        string text;
        uint256 voteCount;
        bytes encryptedInfo;
    }

    struct Vote {
        address voter;
        bytes encryptedVote;
        bytes plainVote; // For non-encrypted ballots
        uint256 timestamp;
        bool revoked;
    }

    struct Receipt {
        bytes32 receiptHash;
        address voter;
        uint256 timestamp;
    }

    // ============= STATE VARIABLES =============
    uint256 public ballotId;
    string public ballotTitle;
    string public ballotDescription;
    BallotType public ballotType;
    BallotStatus public ballotStatus;

    uint256 public startTime;
    uint256 public endTime;
    bool public isEncrypted;
    uint256 public encryptionKey;
    uint256 public totalActiveVotes;

    Option[] public options;
    mapping(address => Vote) public votes;
    mapping(address => bool) public hasVoted;
    mapping(bytes32 => Receipt) public receipts;

    Counters.Counter private receiptCounter;

    // ============= EVENTS =============
    event VoteCast(address indexed voter, uint256 timestamp);
    event VoteRevoked(address indexed voter, uint256 timestamp);
    event BallotFinalized(uint256 totalVotes, uint256 timestamp);
    event BallotClosed(uint256 timestamp);
    event ReceiptGenerated(bytes32 indexed receiptHash, address indexed voter);

    // ============= MODIFIERS =============
    modifier onlyDuringVoting() {
        require(block.timestamp >= startTime && block.timestamp < endTime, "Voting not active");
        require(ballotStatus == BallotStatus.OPEN, "Ballot not open");
        _;
    }

    modifier onlyAfterVoting() {
        require(block.timestamp >= endTime, "Voting still in progress");
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Only admin");
        _;
    }

    modifier onlyVoter() {
        require(hasRole(VOTER_ROLE, msg.sender), "Only voter");
        _;
    }

    // ============= CONSTRUCTOR =============
    constructor(
        uint256 _ballotId,
        string memory _title,
        string memory _description,
        BallotType _ballotType,
        uint256 _startTime,
        uint256 _endTime,
        string[] memory _options,
        bool _isEncrypted,
        address _admin
    ) {
        require(_endTime > _startTime, "Invalid time range");
        require(_options.length >= 2, "Need at least 2 options");

        ballotId = _ballotId;
        ballotTitle = _title;
        ballotDescription = _description;
        ballotType = _ballotType;
        startTime = _startTime;
        endTime = _endTime;
        isEncrypted = _isEncrypted;
        ballotStatus = BallotStatus.OPEN;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);

        for (uint256 i = 0; i < _options.length; i++) {
            options.push(Option({
                id: i,
                text: _options[i],
                voteCount: 0,
                encryptedInfo: ""
            }));
        }
    }

    // ============= VOTING FUNCTIONS =============

    /**
     * @dev Cast a vote on the ballot
     */
    function castVote(
        uint256[] memory selectedOptionIds,
        bytes memory encryptedVote
    ) external onlyVoter onlyDuringVoting nonReentrant {
        require(!hasVoted[msg.sender], "Already voted");
        require(selectedOptionIds.length > 0, "No options selected");

        if (ballotType == BallotType.SINGLE_CHOICE) {
            require(selectedOptionIds.length == 1, "Only one option allowed");
        }

        for (uint256 i = 0; i < selectedOptionIds.length; i++) {
            require(selectedOptionIds[i] < options.length, "Invalid option");
        }

        hasVoted[msg.sender] = true;

        Vote memory newVote = Vote({
            voter: msg.sender,
            encryptedVote: encryptedVote,
            plainVote: isEncrypted ? bytes("") : abi.encode(selectedOptionIds),
            timestamp: block.timestamp,
            revoked: false
        });

        votes[msg.sender] = newVote;

        // Update vote counts if not encrypted
        if (!isEncrypted) {
            for (uint256 i = 0; i < selectedOptionIds.length; i++) {
                options[selectedOptionIds[i]].voteCount++;
            }
        }

        // Generate receipt
        _generateReceipt(msg.sender);

        totalActiveVotes++;

        emit VoteCast(msg.sender, block.timestamp);
    }

    /**
     * @dev Revoke a previously cast vote
     */
    function revokeVote() external onlyVoter onlyDuringVoting nonReentrant {
        require(hasVoted[msg.sender], "No vote to revoke");
        require(!votes[msg.sender].revoked, "Vote already revoked");

        votes[msg.sender].revoked = true;
        hasVoted[msg.sender] = false;

        // Revert vote counts if not encrypted
        if (!isEncrypted) {
            uint256[] memory selectedOptions = abi.decode(votes[msg.sender].plainVote, (uint256[]));
            for (uint256 i = 0; i < selectedOptions.length; i++) {
                if (options[selectedOptions[i]].voteCount > 0) {
                    options[selectedOptions[i]].voteCount--;
                }
            }
        }

        if (totalActiveVotes > 0) {
            totalActiveVotes--;
        }

        emit VoteRevoked(msg.sender, block.timestamp);
    }

    /**
     * @dev Decrypt votes (only admin, after voting ends)
     */
    function decryptVotes(
        address[] memory voterAddresses,
        uint256[][] memory decryptedVotes
    ) external onlyAdmin onlyAfterVoting nonReentrant {
        require(isEncrypted, "Ballot not encrypted");
        require(voterAddresses.length == decryptedVotes.length, "Length mismatch");

        for (uint256 i = 0; i < voterAddresses.length; i++) {
            address voter = voterAddresses[i];
            if (votes[voter].voter != address(0) && !votes[voter].revoked) {
                // Update counts with decrypted votes
                for (uint256 j = 0; j < decryptedVotes[i].length; j++) {
                    require(decryptedVotes[i][j] < options.length, "Invalid decrypted option");
                    options[decryptedVotes[i][j]].voteCount++;
                }
            }
        }
    }

    /**
     * @dev Close the ballot (transition to CLOSED)
     */
    function closeBallot() external onlyAdmin onlyAfterVoting nonReentrant {
        require(ballotStatus == BallotStatus.OPEN, "Ballot not open");
        ballotStatus = BallotStatus.CLOSED;
        emit BallotClosed(block.timestamp);
    }

    /**
     * @dev Finalize the ballot (no further changes allowed)
     */
    function finalizeBallot() external onlyAdmin nonReentrant {
        require(ballotStatus == BallotStatus.CLOSED, "Ballot not closed");
        ballotStatus = BallotStatus.FINALIZED;
        emit BallotFinalized(getTotalVotes(), block.timestamp);
    }

    // ============= VIEW FUNCTIONS =============

    /**
     * @dev Get all options
     */
    function getOptions() external view returns (Option[] memory) {
        return options;
    }

    /**
     * @dev Get option details
     */
    function getOption(uint256 optionId) external view returns (Option memory) {
        require(optionId < options.length, "Invalid option");
        return options[optionId];
    }

    /**
     * @dev Get vote for a voter (encrypted ballots only show encrypted data)
     */
    function getVote(address voter) external view returns (Vote memory) {
        return votes[voter];
    }

    /**
     * @dev Get total votes cast (excluding revoked)
     */
    function getTotalVotes() public view returns (uint256) {
        return totalActiveVotes;
    }

    /**
     * @dev Get ballot status
     */
    function getBallotStatus() external view returns (BallotStatus) {
        return ballotStatus;
    }

    /**
     * @dev Get results (only after finalization or if not encrypted)
     */
    function getResults() external view returns (Option[] memory) {
        require(ballotStatus == BallotStatus.FINALIZED || !isEncrypted, "Results not available");
        return options;
    }

    /**
     * @dev Return encrypted result payload for registry integrations
     */
    function getResultsEncrypted() external view returns (bytes memory) {
        require(isEncrypted, "Ballot is not encrypted");
        require(ballotStatus == BallotStatus.CLOSED || ballotStatus == BallotStatus.FINALIZED, "Results not sealed yet");
        return abi.encode(options);
    }

    /**
     * @dev Check if voter has voted
     */
    function hasVoterVoted(address voter) external view returns (bool) {
        return hasVoted[voter];
    }

    // ============= INTERNAL FUNCTIONS =============

    /**
     * @dev Generate anonymous receipt for vote verification
     */
    function _generateReceipt(address voter) internal {
        bytes32 receiptHash = keccak256(abi.encodePacked(voter, block.timestamp, ballotId));
        receipts[receiptHash] = Receipt({
            receiptHash: receiptHash,
            voter: voter,
            timestamp: block.timestamp
        });
        receiptCounter.increment();

        emit ReceiptGenerated(receiptHash, voter);
    }

    /**
     * @dev Grant voter role
     */
    function grantVoterRole(address voter) external onlyAdmin {
        grantRole(VOTER_ROLE, voter);
    }

    /**
     * @dev Revoke voter role
     */
    function revokeVoterRole(address voter) external onlyAdmin {
        revokeRole(VOTER_ROLE, voter);
    }
}
