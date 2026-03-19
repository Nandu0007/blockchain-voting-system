// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MultiSigVoting
 * @dev Multi-signature voting for critical operations requiring multiple approvals
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MultiSigVoting is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    // ============= ENUMS =============
    enum ProposalStatus { PENDING, APPROVED, REJECTED, EXECUTED, CANCELLED }
    enum ActionType { CAMPAIGN_CREATION, FUND_TRANSFER, ROLE_CHANGE, EMERGENCY_PAUSE }

    // ============= STRUCTS =============
    struct Proposal {
        uint256 id;
        ActionType actionType;
        string description;
        bytes data;
        address proposer;
        uint256 approvalsNeeded;
        uint256 approvalsReceived;
        ProposalStatus status;
        uint256 createdAt;
        uint256 executedAt;
    }

    struct MultiSigSigner {
        address signerAddress;
        string name;
        bool isActive;
        uint256 addedAt;
    }

    // ============= STATE VARIABLES =============
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public proposalApprovals;
    mapping(address => MultiSigSigner) public signers;

    address[] public signersList;
    Counters.Counter private proposalCounter;

    uint256 public requiredApprovalsCount;

    constructor() {
        signers[msg.sender] = MultiSigSigner({
            signerAddress: msg.sender,
            name: "Owner",
            isActive: true,
            addedAt: block.timestamp
        });
        signersList.push(msg.sender);
        requiredApprovalsCount = 1;
    }

    // ============= EVENTS =============
    event ProposalCreated(
        uint256 indexed proposalId,
        ActionType actionType,
        address proposer,
        uint256 timestamp
    );
    event ProposalApproved(uint256 indexed proposalId, address approver, uint256 totalApprovals);
    event ProposalExecuted(uint256 indexed proposalId, uint256 timestamp);
    event ProposalRejected(uint256 indexed proposalId, string reason);
    event SignerAdded(address indexed signer, string name);
    event SignerRemoved(address indexed signer);
    event RequiredApprovalsChanged(uint256 newRequired);

    // ============= MODIFIERS =============
    modifier onlySigners() {
        require(signers[msg.sender].isActive, "Only active signers");
        _;
    }

    modifier proposalExists(uint256 proposalId) {
        require(proposals[proposalId].id != 0, "Proposal not found");
        _;
    }

    // ============= FUNCTIONS =============

    /**
     * @dev Add a multi-sig signer
     */
    function addSigner(address signerAddress, string memory name) external onlyOwner {
        require(signerAddress != address(0), "Invalid address");
        require(!signers[signerAddress].isActive, "Already a signer");

        signers[signerAddress] = MultiSigSigner({
            signerAddress: signerAddress,
            name: name,
            isActive: true,
            addedAt: block.timestamp
        });

        signersList.push(signerAddress);

        emit SignerAdded(signerAddress, name);
    }

    /**
     * @dev Remove a signer
     */
    function removeSigner(address signerAddress) external onlyOwner {
        require(signers[signerAddress].isActive, "Not active signer");

        signers[signerAddress].isActive = false;

        emit SignerRemoved(signerAddress);
    }

    /**
     * @dev Set required number of approvals
     */
    function setRequiredApprovalsCount(uint256 required) external onlyOwner {
        require(required > 0 && required <= signersList.length, "Invalid approval count");
        requiredApprovalsCount = required;

        emit RequiredApprovalsChanged(required);
    }

    /**
     * @dev Create a proposal for multi-sig approval
     */
    function createProposal(
        ActionType actionType,
        string memory description,
        bytes memory data
    ) external onlySigners nonReentrant returns (uint256) {
        proposalCounter.increment();
        uint256 proposalId = proposalCounter.current();

        proposals[proposalId] = Proposal({
            id: proposalId,
            actionType: actionType,
            description: description,
            data: data,
            proposer: msg.sender,
            approvalsNeeded: requiredApprovalsCount,
            approvalsReceived: 0,
            status: ProposalStatus.PENDING,
            createdAt: block.timestamp,
            executedAt: 0
        });

        emit ProposalCreated(proposalId, actionType, msg.sender, block.timestamp);
        return proposalId;
    }

    /**
     * @dev Approve a proposal
     */
    function approveProposal(uint256 proposalId) external onlySigners proposalExists(proposalId) nonReentrant {
        Proposal storage proposal = proposals[proposalId];

        require(proposal.status == ProposalStatus.PENDING, "Proposal not pending");
        require(!proposalApprovals[proposalId][msg.sender], "Already approved");

        proposalApprovals[proposalId][msg.sender] = true;
        proposal.approvalsReceived++;

        emit ProposalApproved(proposalId, msg.sender, proposal.approvalsReceived);

        // Auto-execute if threshold reached
        if (proposal.approvalsReceived >= proposal.approvalsNeeded) {
            _executeProposal(proposalId);
        }
    }

    /**
     * @dev Reject a proposal (if majority votes against)
     */
    function rejectProposal(uint256 proposalId, string memory reason)
        external
        onlySigners
        proposalExists(proposalId)
        nonReentrant
    {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.PENDING, "Proposal not pending");

        proposal.status = ProposalStatus.REJECTED;

        emit ProposalRejected(proposalId, reason);
    }

    /**
     * @dev Execute an approved proposal
     */
    function _executeProposal(uint256 proposalId) internal {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.status != ProposalStatus.PENDING) {
            return;
        }

        proposal.status = ProposalStatus.EXECUTED;
        proposal.executedAt = block.timestamp;

        emit ProposalExecuted(proposalId, block.timestamp);
    }

    /**
     * @dev Get proposal details
     */
    function getProposal(uint256 proposalId) external view proposalExists(proposalId) returns (Proposal memory) {
        return proposals[proposalId];
    }

    /**
     * @dev Check if address has approved a proposal
     */
    function hasApproved(uint256 proposalId, address signer) external view returns (bool) {
        return proposalApprovals[proposalId][signer];
    }

    /**
     * @dev Get all signers
     */
    function getSigners() external view returns (address[] memory) {
        return signersList;
    }

    /**
     * @dev Get active signers count
     */
    function getActiveSignersCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < signersList.length; i++) {
            if (signers[signersList[i]].isActive) {
                count++;
            }
        }
        return count;
    }

    /**
     * @dev Get required approvals count
     */
    function getRequiredApprovalsCount() external view returns (uint256) {
        return requiredApprovalsCount;
    }
}
