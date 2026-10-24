// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface ICrowdFundingFinalize {
    function finalizeRequest(uint256 campaignId, uint256 requestId) external;
}

contract ReentrantRecipient {
    ICrowdFundingFinalize private immutable target;
    uint256 private campaignId;
    uint256 private requestId;
    bool public reentryBlocked;

    constructor(address targetAddress) {
        target = ICrowdFundingFinalize(targetAddress);
    }

    function setRequest(uint256 campaignIdValue, uint256 requestIdValue) external {
        campaignId = campaignIdValue;
        requestId = requestIdValue;
    }

    receive() external payable {
        try target.finalizeRequest(campaignId, requestId) {
            reentryBlocked = false;
        } catch {
            reentryBlocked = true;
        }
    }
}
