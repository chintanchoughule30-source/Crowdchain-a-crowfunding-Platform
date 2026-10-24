// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract CrowdFunding is ReentrancyGuard {
    enum CampaignStatus {
        Active,
        Successful,
        Failed,
        Cancelled,
        PendingReview,
        Rejected
    }

    enum ModerationStatus {
        Pending,
        Approved,
        Rejected
    }

    struct Campaign {
        address owner;
        string metadataCID;
        uint256 target;
        uint256 deadline;
        uint256 amountCollected;
        uint256 amountReleased;
        uint256 reservedAmount;
        address[] donators;
        uint256[] donations;
        bool cancelled;
        ModerationStatus moderationStatus;
    }

    struct Request {
        string description;
        string evidenceCID;
        uint256 amount;
        address payable recipient;
        uint256 votingDeadline;
        uint256 yesVotes;
        uint256 noVotes;
        bool finalized;
        bool approved;
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public donorContributions;
    mapping(uint256 => mapping(address => bool)) public hasRefunded;
    mapping(uint256 => Request[]) private campaignRequests;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasVoted;
    uint256 public numberOfCampaigns;
    uint256 public constant MINIMUM_DONATION = 0.001 ether;
    uint256 public constant VOTING_PERIOD = 3 days;
    address public immutable admin;

    event CampaignCreated(
        uint256 indexed id,
        address indexed owner,
        string metadataCID,
        uint256 target,
        uint256 deadline
    );
    event CampaignModerated(uint256 indexed campaignId, address indexed admin, bool approved, string reason);
    event DonationReceived(uint256 indexed campaignId, address indexed donor, uint256 amount);
    event FundsWithdrawn(uint256 indexed campaignId, uint256 indexed requestId, address indexed recipient, uint256 amount);
    event RefundClaimed(uint256 indexed campaignId, address indexed donor, uint256 amount);
    event CampaignCancelled(uint256 indexed campaignId, address indexed owner);
    event RequestCreated(
        uint256 indexed campaignId,
        uint256 indexed requestId,
        address indexed recipient,
        uint256 amount,
        uint256 votingDeadline,
        string evidenceCID
    );
    event RequestVoted(uint256 indexed campaignId, uint256 indexed requestId, address indexed donor, bool approved, uint256 votingPower);
    event RequestFinalized(uint256 indexed campaignId, uint256 indexed requestId, bool approved, uint256 amount);

    modifier campaignExists(uint256 id) {
        require(id < numberOfCampaigns, "Campaign does not exist");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyCampaignOwner(uint256 id) {
        require(campaigns[id].owner == msg.sender, "Only campaign owner");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function createCampaign(string calldata metadataCID, uint256 target, uint256 deadline)
        external
        returns (uint256 id)
    {
        require(bytes(metadataCID).length > 0, "Metadata CID is required");
        require(target > 0, "Target must be greater than 0");
        require(deadline > block.timestamp, "Deadline must be in the future");

        id = numberOfCampaigns++;
        Campaign storage campaign = campaigns[id];
        campaign.owner = msg.sender;
        campaign.metadataCID = metadataCID;
        campaign.target = target;
        campaign.deadline = deadline;
        campaign.moderationStatus = ModerationStatus.Pending;

        emit CampaignCreated(id, msg.sender, metadataCID, target, deadline);
    }

    function moderateCampaign(uint256 id, bool approved, string calldata reason)
        external
        campaignExists(id)
        onlyAdmin
    {
        Campaign storage campaign = campaigns[id];
        require(campaign.moderationStatus == ModerationStatus.Pending, "Campaign already reviewed");
        require(block.timestamp < campaign.deadline, "Campaign has ended");
        campaign.moderationStatus = approved ? ModerationStatus.Approved : ModerationStatus.Rejected;
        emit CampaignModerated(id, msg.sender, approved, reason);
    }

    function donateToCampaign(uint256 id) external payable campaignExists(id) nonReentrant {
        Campaign storage campaign = campaigns[id];
        require(campaign.moderationStatus == ModerationStatus.Approved, "Campaign is not approved");
        require(msg.value >= MINIMUM_DONATION, "Below minimum donation (0.001 ETH)");
        require(block.timestamp < campaign.deadline, "Campaign has ended");
        require(!campaign.cancelled, "Campaign is cancelled");

        campaign.donators.push(msg.sender);
        campaign.donations.push(msg.value);
        campaign.amountCollected += msg.value;
        donorContributions[id][msg.sender] += msg.value;
        emit DonationReceived(id, msg.sender, msg.value);
    }

    function createRequest(
        uint256 campaignId,
        string calldata description,
        string calldata evidenceCID,
        address payable recipient,
        uint256 amount
    ) external campaignExists(campaignId) onlyCampaignOwner(campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        require(getCampaignStatus(campaignId) == CampaignStatus.Successful, "Campaign is not successful");
        require(bytes(description).length > 0, "Request description is required");
        require(bytes(evidenceCID).length > 0, "Evidence CID is required");
        require(recipient != address(0), "Recipient cannot be zero address");
        require(amount > 0, "Request amount must be greater than 0");
        require(
            amount <= campaign.amountCollected - campaign.amountReleased - campaign.reservedAmount,
            "Request exceeds available funds"
        );

        uint256 requestId = campaignRequests[campaignId].length;
        uint256 votingDeadline = block.timestamp + VOTING_PERIOD;
        campaignRequests[campaignId].push(
            Request(description, evidenceCID, amount, recipient, votingDeadline, 0, 0, false, false)
        );
        campaign.reservedAmount += amount;
        emit RequestCreated(campaignId, requestId, recipient, amount, votingDeadline, evidenceCID);
    }

    function approveRequest(uint256 campaignId, uint256 requestId, bool approve)
        external
        campaignExists(campaignId)
    {
        require(requestId < campaignRequests[campaignId].length, "Request does not exist");
        Request storage request = campaignRequests[campaignId][requestId];
        require(block.timestamp < request.votingDeadline, "Voting period has ended");
        require(!request.finalized, "Request is finalized");
        require(!hasVoted[campaignId][requestId][msg.sender], "Already voted");

        uint256 votingPower = donorContributions[campaignId][msg.sender];
        require(votingPower > 0, "Only donors can vote");
        hasVoted[campaignId][requestId][msg.sender] = true;

        if (approve) {
            request.yesVotes += votingPower;
        } else {
            request.noVotes += votingPower;
        }
        emit RequestVoted(campaignId, requestId, msg.sender, approve, votingPower);
    }

    function finalizeRequest(uint256 campaignId, uint256 requestId)
        external
        campaignExists(campaignId)
        nonReentrant
    {
        require(requestId < campaignRequests[campaignId].length, "Request does not exist");
        Campaign storage campaign = campaigns[campaignId];
        Request storage request = campaignRequests[campaignId][requestId];
        require(block.timestamp >= request.votingDeadline, "Voting period is active");
        require(!request.finalized, "Request is finalized");

        request.finalized = true;
        request.approved = request.yesVotes > campaign.amountCollected / 2;
        campaign.reservedAmount -= request.amount;

        if (request.approved) {
            campaign.amountReleased += request.amount;
            (bool sent, ) = request.recipient.call{value: request.amount}("");
            require(sent, "Transfer failed");
            emit FundsWithdrawn(campaignId, requestId, request.recipient, request.amount);
        }
        emit RequestFinalized(campaignId, requestId, request.approved, request.amount);
    }

    function claimRefund(uint256 id) external campaignExists(id) nonReentrant {
        CampaignStatus status = getCampaignStatus(id);
        require(
            status == CampaignStatus.Failed || status == CampaignStatus.Cancelled,
            "Refunds unavailable"
        );
        require(!hasRefunded[id][msg.sender], "Already refunded");

        uint256 contribution = donorContributions[id][msg.sender];
        require(contribution > 0, "No donation found");
        hasRefunded[id][msg.sender] = true;
        (bool sent, ) = payable(msg.sender).call{value: contribution}("");
        require(sent, "Refund failed");
        emit RefundClaimed(id, msg.sender, contribution);
    }

    function cancelCampaign(uint256 id) external campaignExists(id) onlyCampaignOwner(id) {
        Campaign storage campaign = campaigns[id];
        require(block.timestamp < campaign.deadline, "Campaign has ended");
        require(!campaign.cancelled, "Already cancelled");
        campaign.cancelled = true;
        emit CampaignCancelled(id, msg.sender);
    }

    function getCampaignStatus(uint256 id) public view campaignExists(id) returns (CampaignStatus) {
        Campaign storage campaign = campaigns[id];
        if (campaign.cancelled) return CampaignStatus.Cancelled;
        if (campaign.moderationStatus == ModerationStatus.Pending) return CampaignStatus.PendingReview;
        if (campaign.moderationStatus == ModerationStatus.Rejected) return CampaignStatus.Rejected;
        if (block.timestamp < campaign.deadline) return CampaignStatus.Active;
        if (campaign.amountCollected >= campaign.target) return CampaignStatus.Successful;
        return CampaignStatus.Failed;
    }

    function getCampaigns() external view returns (Campaign[] memory allCampaigns) {
        allCampaigns = new Campaign[](numberOfCampaigns);
        for (uint256 i = 0; i < numberOfCampaigns; i++) {
            allCampaigns[i] = campaigns[i];
        }
    }

    function getDonators(uint256 id)
        external
        view
        campaignExists(id)
        returns (address[] memory, uint256[] memory)
    {
        return (campaigns[id].donators, campaigns[id].donations);
    }

    function getRequests(uint256 campaignId)
        external
        view
        campaignExists(campaignId)
        returns (Request[] memory)
    {
        return campaignRequests[campaignId];
    }
}
