// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VoterRegistry
 * @dev Manages voter eligibility, verification, and tracking
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract VoterRegistry is Ownable {
    using Counters for Counters.Counter;

    // ============= ENUMS =============
    enum VerificationStatus { UNVERIFIED, PENDING, VERIFIED, REJECTED, SUSPENDED }

    // ============= STRUCTS =============
    struct Voter {
        address voterAddress;
        string governmentId; // Hash of government ID
        VerificationStatus status;
        uint256 registeredAt;
        uint256 lastVerificationAt;
        bool isActive;
    }

    struct ElectionEligibility {
        uint256 electionId;
        bool isEligible;
        string reason;
        uint256 assignedAt;
    }

    // ============= STATE VARIABLES =============
    mapping(address => Voter) public voters;
    mapping(address => mapping(uint256 => ElectionEligibility)) public eligibility;
    mapping(string => address) public governmentIdToAddress;

    Counters.Counter private voterCounter;

    address[] public registeredVoters;
    mapping(address => uint256) private voterIndexes;

    // ============= EVENTS =============
    event VoterRegistered(address indexed voter, uint256 timestamp);
    event VoterVerified(address indexed voter, VerificationStatus status, uint256 timestamp);
    event EligibilityAssigned(address indexed voter, uint256 electionId, bool eligible);
    event VoterSuspended(address indexed voter, string reason);
    event VoterActivated(address indexed voter);

    // ============= FUNCTIONS =============

    /**
     * @dev Register a voter with government ID hash
     */
    function registerVoter(address voterAddress, string memory governmentIdHash) external onlyOwner {
        require(voterAddress != address(0), "Invalid address");
        require(bytes(governmentIdHash).length > 0, "Invalid ID hash");
        require(voters[voterAddress].voterAddress == address(0), "Already registered");
        require(governmentIdToAddress[governmentIdHash] == address(0), "ID already used");

        voters[voterAddress] = Voter({
            voterAddress: voterAddress,
            governmentId: governmentIdHash,
            status: VerificationStatus.PENDING,
            registeredAt: block.timestamp,
            lastVerificationAt: 0,
            isActive: true
        });

        governmentIdToAddress[governmentIdHash] = voterAddress;
        registeredVoters.push(voterAddress);
        voterIndexes[voterAddress] = registeredVoters.length - 1;
        voterCounter.increment();

        emit VoterRegistered(voterAddress, block.timestamp);
    }

    /**
     * @dev Verify a voter's eligibility
     */
    function verifyVoter(address voterAddress, VerificationStatus status) external onlyOwner {
        require(voters[voterAddress].voterAddress != address(0), "Voter not found");
        require(status != VerificationStatus.PENDING, "Invalid status");

        voters[voterAddress].status = status;
        voters[voterAddress].lastVerificationAt = block.timestamp;

        emit VoterVerified(voterAddress, status, block.timestamp);
    }

    /**
     * @dev Assign election eligibility to a voter
     */
    function assignEligibility(
        address voterAddress,
        uint256 electionId,
        bool isEligible,
        string memory reason
    ) external onlyOwner {
        require(voters[voterAddress].voterAddress != address(0), "Voter not found");

        eligibility[voterAddress][electionId] = ElectionEligibility({
            electionId: electionId,
            isEligible: isEligible,
            reason: reason,
            assignedAt: block.timestamp
        });

        emit EligibilityAssigned(voterAddress, electionId, isEligible);
    }

    /**
     * @dev Suspend a voter
     */
    function suspendVoter(address voterAddress, string memory reason) external onlyOwner {
        require(voters[voterAddress].voterAddress != address(0), "Voter not found");

        voters[voterAddress].isActive = false;
        voters[voterAddress].status = VerificationStatus.SUSPENDED;

        emit VoterSuspended(voterAddress, reason);
    }

    /**
     * @dev Reactivate a voter
     */
    function activateVoter(address voterAddress) external onlyOwner {
        require(voters[voterAddress].voterAddress != address(0), "Voter not found");

        voters[voterAddress].isActive = true;
        voters[voterAddress].status = VerificationStatus.VERIFIED;

        emit VoterActivated(voterAddress);
    }

    /**
     * @dev Get voter details
     */
    function getVoter(address voterAddress) external view returns (Voter memory) {
        require(voters[voterAddress].voterAddress != address(0), "Voter not found");
        return voters[voterAddress];
    }

    /**
     * @dev Check if voter is eligible for an election
     */
    function isEligibleForElection(address voterAddress, uint256 electionId) external view returns (bool) {
        Voter memory voter = voters[voterAddress];
        if (voter.voterAddress == address(0)) return false;
        if (!voter.isActive) return false;
        if (voter.status != VerificationStatus.VERIFIED) return false;

        ElectionEligibility memory elec = eligibility[voterAddress][electionId];
        return elec.isEligible;
    }

    /**
     * @dev Check if voter can vote
     */
    function canVote(address voterAddress) external view returns (bool) {
        Voter memory voter = voters[voterAddress];
        return voter.voterAddress != address(0) && 
               voter.isActive && 
               voter.status == VerificationStatus.VERIFIED;
    }

    /**
     * @dev Get total registered voters
     */
    function getTotalVoters() external view returns (uint256) {
        return registeredVoters.length;
    }

    /**
     * @dev Get registered voters list (paginated)
     */
    function getRegisteredVoters(uint256 offset, uint256 limit) external view returns (address[] memory) {
        require(offset < registeredVoters.length, "Offset out of bounds");

        uint256 length = limit;
        if (offset + limit > registeredVoters.length) {
            length = registeredVoters.length - offset;
        }

        address[] memory result = new address[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = registeredVoters[offset + i];
        }

        return result;
    }

    /**
     * @dev Get voter eligibility for an election
     */
    function getEligibility(address voterAddress, uint256 electionId)
        external
        view
        returns (ElectionEligibility memory)
    {
        return eligibility[voterAddress][electionId];
    }
}
