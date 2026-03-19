// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VotingRegistry
 * @dev Main registry for managing voting campaigns, ballots, and overall voting system
 * @notice Implements RBAC, campaign management, and audit trail functionality
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IBallot {
    function getBallotStatus() external view returns (uint8);
    function getResultsEncrypted() external view returns (bytes memory);
}

contract VotingRegistry is Ownable, Pausable, ReentrancyGuard {
    // ============= ENUMS =============
    enum Role { NONE, VOTER, ADMIN, AUDITOR, OBSERVER }
    enum CampaignStatus { PENDING, ACTIVE, PAUSED, ENDED, CANCELLED }
    enum BallotType { SINGLE_CHOICE, MULTI_CHOICE, RANKING }

    // ============= STRUCTS =============
    struct Campaign {
        uint256 id;
        string title;
        string description;
        address creator;
        uint256 startTime;
        uint256 endTime;
        CampaignStatus status;
        address ballotAddress;
        BallotType ballotType;
        bool encryptedVotes;
        uint256 createdAt;
    }

    struct AuditLog {
        uint256 id;
        uint256 campaignId;
        address actor;
        string action;
        bytes data;
        uint256 timestamp;
    }

    struct UserRole {
        Role role;
        uint256 assignedAt;
    }

    // ============= STATE VARIABLES =============
    mapping(uint256 => Campaign) public campaigns;
    mapping(address => UserRole) public userRoles;
    mapping(address => bool) public isVerifiedVoter;
    mapping(uint256 => AuditLog[]) public campaignAuditLogs;

    uint256 public campaignCounter;
    uint256 public auditLogCounter;

    // ============= EVENTS =============
    event CampaignCreated(
        uint256 indexed campaignId,
        string title,
        address creator,
        uint256 startTime,
        uint256 endTime
    );
    event CampaignStatusChanged(uint256 indexed campaignId, CampaignStatus newStatus);
    event RoleAssigned(address indexed user, Role role);
    event VoterVerified(address indexed voter);
    event AuditLogged(uint256 indexed campaignId, address actor, string action);
    event CampaignPaused(uint256 indexed campaignId, string reason);
    event CampaignResumed(uint256 indexed campaignId);

    // ============= MODIFIERS =============
    modifier onlyRole(Role requiredRole) {
        require(userRoles[msg.sender].role == requiredRole || userRoles[msg.sender].role == Role.ADMIN, "Insufficient permissions");
        _;
    }

    modifier onlyAdmin() {
        require(userRoles[msg.sender].role == Role.ADMIN || msg.sender == owner(), "Only admin");
        _;
    }

    modifier campaignExists(uint256 campaignId) {
        require(campaigns[campaignId].id != 0, "Campaign does not exist");
        _;
    }

    modifier campaignActive(uint256 campaignId) {
        require(campaigns[campaignId].status == CampaignStatus.ACTIVE, "Campaign not active");
        _;
    }

    modifier voterEligible(address voter) {
        require(isVerifiedVoter[voter], "Voter not verified");
        require(userRoles[voter].role == Role.VOTER || userRoles[voter].role == Role.ADMIN, "Not a voter");
        _;
    }

    // ============= FUNCTIONS =============

    /**
     * @dev Create a new voting campaign
     */
    function createCampaign(
        string memory title,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        address ballotAddress,
        BallotType ballotType,
        bool encryptedVotes
    ) external onlyAdmin nonReentrant returns (uint256) {
        require(startTime >= block.timestamp, "Start time must be in future");
        require(endTime > startTime, "End time must be after start time");
        require(ballotAddress != address(0), "Invalid ballot address");

        campaignCounter++;
        uint256 campaignId = campaignCounter;

        campaigns[campaignId] = Campaign({
            id: campaignId,
            title: title,
            description: description,
            creator: msg.sender,
            startTime: startTime,
            endTime: endTime,
            status: CampaignStatus.PENDING,
            ballotAddress: ballotAddress,
            ballotType: ballotType,
            encryptedVotes: encryptedVotes,
            createdAt: block.timestamp
        });

        _logAudit(campaignId, "CAMPAIGN_CREATED", abi.encode(title, ballotType));

        emit CampaignCreated(campaignId, title, msg.sender, startTime, endTime);
        return campaignId;
    }

    /**
     * @dev Activate a campaign (transition from PENDING to ACTIVE)
     */
    function activateCampaign(uint256 campaignId) external onlyAdmin campaignExists(campaignId) nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.PENDING, "Campaign not in pending state");
        require(block.timestamp >= campaign.startTime, "Campaign start time not reached");

        campaign.status = CampaignStatus.ACTIVE;
        _logAudit(campaignId, "CAMPAIGN_ACTIVATED", "");

        emit CampaignStatusChanged(campaignId, CampaignStatus.ACTIVE);
    }

    /**
     * @dev Pause a campaign (can be resumed later)
     */
    function pauseCampaign(uint256 campaignId, string memory reason) external onlyAdmin campaignExists(campaignId) nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.ACTIVE, "Campaign not active");

        campaign.status = CampaignStatus.PAUSED;
        _logAudit(campaignId, "CAMPAIGN_PAUSED", abi.encode(reason));

        emit CampaignPaused(campaignId, reason);
    }

    /**
     * @dev Resume a paused campaign
     */
    function resumeCampaign(uint256 campaignId) external onlyAdmin campaignExists(campaignId) nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.PAUSED, "Campaign not paused");

        campaign.status = CampaignStatus.ACTIVE;
        _logAudit(campaignId, "CAMPAIGN_RESUMED", "");

        emit CampaignResumed(campaignId);
    }

    /**
     * @dev End a campaign and finalize results
     */
    function endCampaign(uint256 campaignId) external onlyAdmin campaignExists(campaignId) nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        require(
            campaign.status == CampaignStatus.ACTIVE || campaign.status == CampaignStatus.PAUSED,
            "Campaign cannot be ended"
        );
        require(block.timestamp >= campaign.endTime, "Campaign has not ended yet");

        campaign.status = CampaignStatus.ENDED;
        _logAudit(campaignId, "CAMPAIGN_ENDED", abi.encode(block.timestamp));

        emit CampaignStatusChanged(campaignId, CampaignStatus.ENDED);
    }

    /**
     * @dev Assign role to a user (RBAC)
     */
    function assignRole(address user, Role role) external onlyAdmin nonReentrant {
        require(user != address(0), "Invalid address");
        require(role != Role.NONE, "Cannot assign NONE role");

        userRoles[user] = UserRole({
            role: role,
            assignedAt: block.timestamp
        });

        if (role == Role.VOTER) {
            isVerifiedVoter[user] = true;
        }

        emit RoleAssigned(user, role);
    }

    /**
     * @dev Verify a voter's eligibility
     */
    function verifyVoter(address voter) external onlyAdmin nonReentrant {
        require(voter != address(0), "Invalid address");
        isVerifiedVoter[voter] = true;
        _logAudit(campaignCounter, "VOTER_VERIFIED", abi.encode(voter));

        emit VoterVerified(voter);
    }

    /**
     * @dev Get campaign details
     */
    function getCampaign(uint256 campaignId) external view campaignExists(campaignId) returns (Campaign memory) {
        return campaigns[campaignId];
    }

    /**
     * @dev Get user role
     */
    function getUserRole(address user) external view returns (Role) {
        return userRoles[user].role;
    }

    /**
     * @dev Check if campaign is currently active
     */
    function isCampaignActive(uint256 campaignId) external view campaignExists(campaignId) returns (bool) {
        Campaign memory campaign = campaigns[campaignId];
        return campaign.status == CampaignStatus.ACTIVE && 
               block.timestamp >= campaign.startTime && 
               block.timestamp < campaign.endTime;
    }

    /**
     * @dev Get audit logs for a campaign
     */
    function getAuditLogs(uint256 campaignId) external view campaignExists(campaignId) returns (AuditLog[] memory) {
        return campaignAuditLogs[campaignId];
    }

    /**
     * @dev Internal function to log audit events
     */
    function _logAudit(uint256 campaignId, string memory action, bytes memory data) internal {
        auditLogCounter++;
        campaignAuditLogs[campaignId].push(AuditLog({
            id: auditLogCounter,
            campaignId: campaignId,
            actor: msg.sender,
            action: action,
            data: data,
            timestamp: block.timestamp
        }));

        emit AuditLogged(campaignId, msg.sender, action);
    }

    /**
     * @dev Emergency pause function
     */
    function emergencyPause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause function
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
