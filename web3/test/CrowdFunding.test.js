const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CrowdFunding milestone escrow", function () {
  let contract;
  let owner;
  let donor1;
  let donor2;
  let stranger;
  const oneEth = ethers.parseEther("1");
  const twoEth = ethers.parseEther("2");
  const fourEth = ethers.parseEther("4");
  const fiveEth = ethers.parseEther("5");

  async function createCampaign(target = fiveEth, duration = 10) {
    const deadline = (await time.latest()) + duration;
    const campaignId = await contract.numberOfCampaigns();
    await contract.createCampaign("bafy-metadata-cid", target, deadline);
    await contract.moderateCampaign(campaignId, true, "Approved for contract test");
    return deadline;
  }

  async function makeSuccessfulCampaign() {
    const deadline = await createCampaign(fiveEth);
    await contract.connect(donor1).donateToCampaign(0, { value: threeEth });
    await contract.connect(donor2).donateToCampaign(0, { value: twoEth });
    await time.increaseTo(deadline + 1);
  }

  const threeEth = ethers.parseEther("3");

  beforeEach(async function () {
    [owner, donor1, donor2, stranger] = await ethers.getSigners();
    const CrowdFunding = await ethers.getContractFactory("CrowdFunding");
    contract = await CrowdFunding.deploy();
    await contract.waitForDeployment();
  });

  it("stores only a metadata CID and campaign funding terms on-chain", async function () {
    const deadline = await createCampaign();
    const campaign = await contract.campaigns(0);
    expect(campaign.owner).to.equal(owner.address);
    expect(campaign.metadataCID).to.equal("bafy-metadata-cid");
    expect(campaign.target).to.equal(fiveEth);
    expect(await contract.numberOfCampaigns()).to.equal(1);
    expect(await contract.getCampaignStatus(0)).to.equal(0);
    expect(deadline).to.be.greaterThan(0);
  });

  it("rejects empty metadata, zero targets, and past deadlines", async function () {
    const deadline = (await time.latest()) + 100;
    await expect(contract.createCampaign("", oneEth, deadline)).to.be.revertedWith("Metadata CID is required");
    await expect(contract.createCampaign("cid", 0, deadline)).to.be.revertedWith("Target must be greater than 0");
    await expect(contract.createCampaign("cid", oneEth, (await time.latest()) - 1))
      .to.be.revertedWith("Deadline must be in the future");
  });

  it("requires admin approval before a campaign can receive donations", async function () {
    const deadline = (await time.latest()) + 100;
    await contract.createCampaign("bafy-pending-cid", oneEth, deadline);
    expect(await contract.getCampaignStatus(0)).to.equal(4);
    await expect(contract.connect(donor1).donateToCampaign(0, { value: oneEth }))
      .to.be.revertedWith("Campaign is not approved");
    await expect(contract.connect(stranger).moderateCampaign(0, true, "not authorized"))
      .to.be.revertedWith("Only admin");
    await contract.moderateCampaign(0, true, "Approved");
    expect(await contract.getCampaignStatus(0)).to.equal(0);
    await expect(contract.connect(donor1).donateToCampaign(0, { value: oneEth }))
      .to.emit(contract, "DonationReceived");
  });

  it("prevents donations to a rejected campaign", async function () {
    await createCampaign();
    await contract.createCampaign("bafy-rejected-cid", oneEth, (await time.latest()) + 100);
    await contract.moderateCampaign(1, false, "Insufficient campaign details");
    expect(await contract.getCampaignStatus(1)).to.equal(5);
    await expect(contract.connect(donor1).donateToCampaign(1, { value: oneEth }))
      .to.be.revertedWith("Campaign is not approved");
  });

  it("prevents the admin from approving an expired campaign", async function () {
    const deadline = (await time.latest()) + 10;
    await contract.createCampaign("bafy-expired-cid", oneEth, deadline);
    await time.increaseTo(deadline + 1);
    await expect(contract.moderateCampaign(0, true, "Too late"))
      .to.be.revertedWith("Campaign has ended");
  });

  it("accepts donations and tracks cumulative donor voting power", async function () {
    await createCampaign();
    await expect(contract.connect(donor1).donateToCampaign(0, { value: oneEth }))
      .to.emit(contract, "DonationReceived").withArgs(0, donor1.address, oneEth);
    await contract.connect(donor1).donateToCampaign(0, { value: oneEth });
    expect(await contract.donorContributions(0, donor1.address)).to.equal(twoEth);
  });

  it("rejects dust, expired, and cancelled campaign donations", async function () {
    const deadline = await createCampaign();
    await expect(contract.connect(donor1).donateToCampaign(0, { value: 1 }))
      .to.be.revertedWith("Below minimum donation (0.001 ETH)");
    await contract.cancelCampaign(0);
    await expect(contract.connect(donor1).donateToCampaign(0, { value: oneEth }))
      .to.be.revertedWith("Campaign is cancelled");
    await time.increaseTo(deadline + 1);
    await expect(contract.connect(donor1).donateToCampaign(0, { value: oneEth }))
      .to.be.revertedWith("Campaign has ended");
  });

  it("allows failed-campaign donors to claim one refund", async function () {
    const deadline = await createCampaign();
    await contract.connect(donor1).donateToCampaign(0, { value: oneEth });
    await time.increaseTo(deadline + 1);
    await expect(contract.connect(donor1).claimRefund(0))
      .to.emit(contract, "RefundClaimed").withArgs(0, donor1.address, oneEth);
    await expect(contract.connect(donor1).claimRefund(0)).to.be.revertedWith("Already refunded");
  });

  it("only permits cancellation before the campaign deadline", async function () {
    const deadline = await createCampaign();
    await time.increaseTo(deadline + 1);
    await expect(contract.cancelCampaign(0)).to.be.revertedWith("Campaign has ended");
  });

  it("requires a successful campaign and creator to create a bounded spending request", async function () {
    await createCampaign();
    await expect(contract.createRequest(0, "Equipment", "bafy-evidence-cid", owner.address, oneEth))
      .to.be.revertedWith("Campaign is not successful");

    await makeSuccessfulCampaign();
    await expect(contract.connect(stranger).createRequest(0, "Equipment", "bafy-evidence-cid", owner.address, oneEth))
      .to.be.revertedWith("Only campaign owner");
    await expect(contract.createRequest(0, "Equipment", "bafy-evidence-cid", owner.address, ethers.parseEther("6")))
      .to.be.revertedWith("Request exceeds available funds");
    await expect(contract.createRequest(0, "Equipment", "bafy-evidence-cid", ethers.ZeroAddress, oneEth))
      .to.be.revertedWith("Recipient cannot be zero address");
    await expect(contract.createRequest(0, "Equipment", "", owner.address, oneEth))
      .to.be.revertedWith("Evidence CID is required");
    await expect(contract.createRequest(0, "Equipment", "bafy-evidence-cid", owner.address, oneEth))
      .to.emit(contract, "RequestCreated");
  });

  it("allows donors to vote once, weighted by their contributions", async function () {
    await makeSuccessfulCampaign();
    await contract.createRequest(0, "Buy equipment", "bafy-evidence-cid", owner.address, oneEth);
    await expect(contract.connect(donor1).approveRequest(0, 0, true))
      .to.emit(contract, "RequestVoted").withArgs(0, 0, donor1.address, true, threeEth);
    await expect(contract.connect(donor1).approveRequest(0, 0, false))
      .to.be.revertedWith("Already voted");
    await expect(contract.connect(stranger).approveRequest(0, 0, true))
      .to.be.revertedWith("Only donors can vote");
  });

  it("releases a requested amount only after donor majority approval", async function () {
    await makeSuccessfulCampaign();
    await contract.createRequest(0, "Server equipment", "bafy-evidence-cid", owner.address, twoEth);
    await contract.connect(donor1).approveRequest(0, 0, true);
    const balanceBefore = await ethers.provider.getBalance(owner.address);
    await time.increase(await contract.VOTING_PERIOD());
    await expect(contract.finalizeRequest(0, 0))
      .to.emit(contract, "FundsWithdrawn").withArgs(0, 0, owner.address, twoEth);
    expect(await ethers.provider.getBalance(owner.address)).to.be.greaterThan(balanceBefore);
    expect((await contract.campaigns(0)).amountReleased).to.equal(twoEth);
  });

  it("does not release funds when yes votes are 50% or less", async function () {
    await makeSuccessfulCampaign();
    await contract.createRequest(0, "Research supplies", "bafy-evidence-cid", owner.address, oneEth);
    await contract.connect(donor2).approveRequest(0, 0, true);
    await time.increase(await contract.VOTING_PERIOD());
    await expect(contract.finalizeRequest(0, 0))
      .to.emit(contract, "RequestFinalized").withArgs(0, 0, false, oneEth);
    expect((await contract.campaigns(0)).amountReleased).to.equal(0);
    expect((await contract.campaigns(0)).reservedAmount).to.equal(0);
  });

  it("rejects a milestone vote with exactly 50% of contributed ETH", async function () {
    const deadline = await createCampaign(fourEth);
    await contract.connect(donor1).donateToCampaign(0, { value: twoEth });
    await contract.connect(donor2).donateToCampaign(0, { value: twoEth });
    await time.increaseTo(deadline + 1);
    await contract.createRequest(0, "Equipment", "bafy-evidence-cid", owner.address, oneEth);
    await contract.connect(donor1).approveRequest(0, 0, true);
    await time.increase(await contract.VOTING_PERIOD());

    await contract.finalizeRequest(0, 0);
    expect((await contract.getRequests(0))[0].yesVotes).to.equal(twoEth);
    expect((await contract.getRequests(0))[0].approved).to.equal(false);
  });

  it("does not expose a direct creator withdrawal function", async function () {
    expect(contract.interface.hasFunction("withdrawFunds")).to.equal(false);
  });

  it("does not allow pending requests to reserve more funds than the escrow", async function () {
    await makeSuccessfulCampaign();
    await contract.createRequest(0, "First", "bafy-evidence-cid", owner.address, threeEth);
    await expect(contract.createRequest(0, "Second", "bafy-evidence-cid", owner.address, threeEth))
      .to.be.revertedWith("Request exceeds available funds");
  });

  it("keeps multiple outstanding commitments and completed payouts within collected escrow", async function () {
    await makeSuccessfulCampaign();
    await contract.createRequest(0, "First milestone", "bafy-evidence-one", owner.address, threeEth);
    await contract.createRequest(0, "Second milestone", "bafy-evidence-two", owner.address, twoEth);
    await expect(contract.createRequest(0, "Overcommit", "bafy-evidence-three", owner.address, 1n))
      .to.be.revertedWith("Request exceeds available funds");
    expect((await contract.campaigns(0)).reservedAmount).to.equal(fiveEth);

    await contract.connect(donor1).approveRequest(0, 0, true);
    await time.increase(await contract.VOTING_PERIOD());
    await contract.finalizeRequest(0, 0);
    const afterPayout = await contract.campaigns(0);
    expect(afterPayout.amountReleased + afterPayout.reservedAmount).to.equal(fiveEth);
    expect(await ethers.provider.getBalance(await contract.getAddress())).to.equal(twoEth);

    await time.increase(await contract.VOTING_PERIOD());
    await contract.finalizeRequest(0, 1);
    const afterRejection = await contract.campaigns(0);
    expect(afterRejection.amountReleased + afterRejection.reservedAmount).to.be.lessThanOrEqual(afterRejection.amountCollected);
  });

  it("blocks reentrancy attempts from a milestone recipient", async function () {
    await makeSuccessfulCampaign();
    const ReentrantRecipient = await ethers.getContractFactory("ReentrantRecipient");
    const recipient = await ReentrantRecipient.deploy(await contract.getAddress());
    await recipient.waitForDeployment();
    await contract.createRequest(0, "Reentrancy probe", "bafy-evidence-cid", await recipient.getAddress(), oneEth);
    await recipient.setRequest(0, 0);
    await contract.connect(donor1).approveRequest(0, 0, true);
    await time.increase(await contract.VOTING_PERIOD());
    await contract.finalizeRequest(0, 0);
    expect(await recipient.reentryBlocked()).to.equal(true);
    expect((await contract.campaigns(0)).amountReleased).to.equal(oneEth);
  });

  it("blocks early and duplicate finalization", async function () {
    await makeSuccessfulCampaign();
    await contract.createRequest(0, "Equipment", "bafy-evidence-cid", owner.address, oneEth);
    await expect(contract.finalizeRequest(0, 0)).to.be.revertedWith("Voting period is active");
    await time.increase(await contract.VOTING_PERIOD());
    await contract.finalizeRequest(0, 0);
    await expect(contract.finalizeRequest(0, 0)).to.be.revertedWith("Request is finalized");
  });

  it("returns all campaigns, donors, and spending requests", async function () {
    await makeSuccessfulCampaign();
    await contract.createRequest(0, "Equipment", "bafy-evidence-cid", owner.address, oneEth);
    expect((await contract.getCampaigns()).length).to.equal(1);
    expect((await contract.getDonators(0))[0].length).to.equal(2);
    expect((await contract.getRequests(0)).length).to.equal(1);
  });
});
