// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VoteDelegation
 * @dev Manages voter delegation - voters can delegate their vote to representatives
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract VoteDelegation is Ownable, ReentrancyGuard {
    // ============= STRUCTS =============
    struct Delegation {
        address delegator;
        address delegate;
        uint256 campaignId;
        uint256 delegatedAt;
        bool revoked;
    }

    // ============= STATE VARIABLES =============
    mapping(address => mapping(uint256 => address)) public delegations; // delegator -> campaignId -> delegate
    mapping(address => mapping(uint256 => Delegation[])) public delegationHistory;
    mapping(address => mapping(uint256 => uint256)) public delegatedVoteCount; // delegate -> campaignId -> count

    // ============= EVENTS =============
    event DelegationCreated(
        address indexed delegator,
        address indexed delegate,
        uint256 indexed campaignId,
        uint256 timestamp
    );
    event DelegationRevoked(
        address indexed delegator,
        uint256 indexed campaignId,
        uint256 timestamp
    );
    event ChainDelegationDetected(address indexed voter, uint256 indexed campaignId);

    // ============= MODIFIERS =============
    modifier validAddresses(address delegator, address delegate) {
        require(delegator != address(0) && delegate != address(0), "Invalid addresses");
        require(delegator != delegate, "Cannot delegate to self");
        _;
    }

    // ============= FUNCTIONS =============

    /**
     * @dev Create a delegation for a campaign
     */
    function createDelegation(
        address delegator,
        address delegate,
        uint256 campaignId
    ) external onlyOwner nonReentrant validAddresses(delegator, delegate) {
        require(delegations[delegator][campaignId] == address(0), "Already delegated");

        // Check for chain delegation
        address currentDelegate = delegate;
        for (uint256 i = 0; i < 5; i++) {
            address nextDelegate = delegations[currentDelegate][campaignId];
            if (nextDelegate == address(0)) break;
            if (nextDelegate == delegator) {
                emit ChainDelegationDetected(delegator, campaignId);
                revert("Chain delegation detected");
            }
            currentDelegate = nextDelegate;
        }

        delegations[delegator][campaignId] = delegate;
        delegatedVoteCount[delegate][campaignId]++;

        Delegation memory newDelegation = Delegation({
            delegator: delegator,
            delegate: delegate,
            campaignId: campaignId,
            delegatedAt: block.timestamp,
            revoked: false
        });

        delegationHistory[delegator][campaignId].push(newDelegation);

        emit DelegationCreated(delegator, delegate, campaignId, block.timestamp);
    }

    /**
     * @dev Revoke a delegation
     */
    function revokeDelegation(address delegator, uint256 campaignId) external onlyOwner nonReentrant {
        address delegate = delegations[delegator][campaignId];
        require(delegate != address(0), "No delegation found");

        delegations[delegator][campaignId] = address(0);

        if (delegatedVoteCount[delegate][campaignId] > 0) {
            delegatedVoteCount[delegate][campaignId]--;
        }

        delegationHistory[delegator][campaignId].push(
            Delegation({
                delegator: delegator,
                delegate: address(0),
                campaignId: campaignId,
                delegatedAt: block.timestamp,
                revoked: true
            })
        );

        emit DelegationRevoked(delegator, campaignId, block.timestamp);
    }

    /**
     * @dev Get current delegate for a voter
     */
    function getDelegate(address delegator, uint256 campaignId) external view returns (address) {
        return delegations[delegator][campaignId];
    }

    /**
     * @dev Get delegated vote count for a delegate
     */
    function getDelegatedVoteCount(address delegate, uint256 campaignId) external view returns (uint256) {
        return delegatedVoteCount[delegate][campaignId];
    }

    /**
     * @dev Check if delegation exists
     */
    function hasDelegation(address delegator, uint256 campaignId) external view returns (bool) {
        return delegations[delegator][campaignId] != address(0);
    }

    /**
     * @dev Get delegation history
     */
    function getDelegationHistory(address delegator, uint256 campaignId)
        external
        view
        returns (Delegation[] memory)
    {
        return delegationHistory[delegator][campaignId];
    }

    /**
     * @dev Get final vote authority (accounts for delegation chains)
     */
    function getFinalVoteAuthority(address voter, uint256 campaignId) external view returns (address) {
        address current = voter;
        uint256 depth = 0;

        while (delegations[current][campaignId] != address(0) && depth < 5) {
            current = delegations[current][campaignId];
            depth++;
        }

        return current;
    }
}
