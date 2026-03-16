// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract PredictionRecord {

    struct Sale {
        string batchId;
        uint quantity;
        uint basePrice;
        uint highestBid;
        address farmer;
        address highestBidder;
        bool confirmed;
    }

    Sale[] public sales;

    // Farmer creates crop sale
    function createSale(
        string memory _batchId,
        uint _quantity,
        uint _basePrice
    ) public {

        sales.push(Sale({
            batchId: _batchId,
            quantity: _quantity,
            basePrice: _basePrice,
            highestBid: 0,
            farmer: msg.sender,
            highestBidder: address(0),
            confirmed: false
        }));
    }

    // Buyer places bid
    function placeBid(uint saleId, uint _bidAmount) public {

        require(!sales[saleId].confirmed, "Sale already confirmed");
        require(_bidAmount > sales[saleId].highestBid, "Bid too low");

        sales[saleId].highestBid = _bidAmount;
        sales[saleId].highestBidder = msg.sender;
    }

    // Farmer confirms highest bid
    function confirmSale(uint saleId) public {

        require(msg.sender == sales[saleId].farmer, "Only farmer can confirm");
        require(!sales[saleId].confirmed, "Already confirmed");

        sales[saleId].confirmed = true;
    }

    function getTotalSales() public view returns (uint) {
        return sales.length;
    }

    function getSale(uint saleId) public view returns (
        string memory,
        uint,
        uint,
        uint,
        address,
        address,
        bool
    ) {
        Sale memory s = sales[saleId];
        return (
            s.batchId,
            s.quantity,
            s.basePrice,
            s.highestBid,
            s.farmer,
            s.highestBidder,
            s.confirmed
        );
    }
}
