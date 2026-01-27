import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ShoppingCart, TrendingUp, Plus, Minus } from "lucide-react";
import toast from "react-hot-toast";

const MarketplaceCard = ({ listing, onPurchase }) => {
  const { user } = useAuth();
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);

  const handlePurchase = () => {
    if (!user) {
      toast.error("Please login to purchase");
      return;
    }
    if (listing.quantity <= 0) {
      toast.error("Out of stock");
      return;
    }
    if (purchaseQuantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (purchaseQuantity > listing.quantity) {
      toast.error(`Only ${listing.quantity} ${listing.unit} available`);
      return;
    }
    onPurchase(purchaseQuantity);
    setPurchaseQuantity(1);
  };

  const increaseQuantity = () => {
    if (purchaseQuantity < listing.quantity) {
      setPurchaseQuantity((prev) => prev + 1);
    }
  };

  const decreaseQuantity = () => {
    if (purchaseQuantity > 1) {
      setPurchaseQuantity((prev) => prev - 1);
    }
  };

  const totalValue = (listing.price_per_unit * listing.quantity).toFixed(2);
  const cropName = listing.crop_name || listing.cropName;
  const farmerName = listing.farmer_name || listing.farmerName;
  const pricePerUnit = listing.price_per_unit || listing.pricePerUnit;
  const createdAt = listing.created_at || listing.createdAt;
  const status = listing.status === "sold_out" ? "bought" : listing.status;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition h-full flex flex-col relative">
      {/* SOLD OUT Badge */}
      {status === "bought" && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded-2xl">
          <div className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold text-lg transform -rotate-12">
            SOLD OUT
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
        <h3 className="text-lg font-bold text-white">{cropName}</h3>
        <p className="text-green-100 text-sm">By {farmerName}</p>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 flex-1 flex flex-col">
        {/* Description */}
        {listing.description && (
          <p className="text-gray-600 text-sm mb-4">{listing.description}</p>
        )}

        {/* Price Section */}
        <div className="mb-4 bg-green-50 p-4 rounded-lg">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-green-600">
              ₹{pricePerUnit.toFixed(2)}
            </span>
            <span className="text-gray-600 text-sm">per {listing.unit}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <TrendingUp size={16} className="text-green-600" />
            Total: ₹{totalValue}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-gray-600 text-xs font-semibold uppercase">Qty</p>
            <p className="text-gray-800 font-bold text-lg">
              {listing.quantity}
            </p>
            <p className="text-gray-500 text-xs">{listing.unit}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-gray-600 text-xs font-semibold uppercase">
              Status
            </p>
            <p
              className={`font-bold text-sm ${
                status === "bought"
                  ? "text-red-600"
                  : listing.quantity > 0
                    ? "text-green-600"
                    : "text-red-600"
              }`}
            >
              {status === "bought"
                ? "Sold Out"
                : listing.quantity > 0
                  ? "In Stock"
                  : "Out"}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-gray-500 text-xs mb-4 pt-3 border-t border-gray-200">
          Listed: {new Date(createdAt).toLocaleDateString()}
        </div>

        {/* Quantity Selector - For Buyers */}
        {user && listing.quantity > 0 && status !== "bought" && (
          <div className="mb-4 flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <span className="text-sm font-semibold text-gray-700 flex-shrink-0">
              Qty:
            </span>
            <button
              onClick={decreaseQuantity}
              disabled={purchaseQuantity <= 1}
              className="p-1 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Minus size={16} className="text-gray-700" />
            </button>
            <input
              type="number"
              min="1"
              max={listing.quantity}
              value={purchaseQuantity}
              onChange={(e) => {
                const val = Math.min(
                  Math.max(1, parseInt(e.target.value) || 1),
                  listing.quantity,
                );
                setPurchaseQuantity(val);
              }}
              className="w-12 text-center p-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={increaseQuantity}
              disabled={purchaseQuantity >= listing.quantity}
              className="p-1 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Plus size={16} className="text-gray-700" />
            </button>
            <span className="text-xs text-gray-600 ml-auto flex-shrink-0">
              (Max: {listing.quantity})
            </span>
          </div>
        )}

        {/* Action Button */}
        {user ? (
          <button
            onClick={handlePurchase}
            disabled={listing.quantity <= 0 || status === "bought"}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition ${
              listing.quantity > 0 && status !== "bought"
                ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white cursor-pointer shadow-md"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <ShoppingCart size={18} />
            {status === "bought"
              ? "Sold Out"
              : listing.quantity > 0
                ? `Order ${purchaseQuantity} ${listing.unit}`
                : "Out of Stock"}
          </button>
        ) : (
          <div className="text-center py-3 bg-gray-100 rounded-lg text-gray-600 text-sm font-semibold border border-gray-200">
            Login to Order
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketplaceCard;
//               <Plus size={16} className="text-gray-700" />
//             </button>
//             <span className="text-xs text-gray-600 ml-auto flex-shrink-0">
//               (Max: {listing.quantity})
//             </span>
//           </div>
//         )}

//         {/* Action Button */}
//         {user ? (
//           <button
//             onClick={handlePurchase}
//             disabled={listing.quantity <= 0 || listing.status === "bought"}
//             className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition ${
//               listing.quantity > 0 && listing.status !== "bought"
//                 ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white cursor-pointer shadow-md"
//                 : "bg-gray-300 text-gray-500 cursor-not-allowed"
//             }`}
//           >
//             <ShoppingCart size={18} />
//             {listing.status === "bought"
//               ? "Sold Out"
//               : listing.quantity > 0
//               ? `Order ${purchaseQuantity} ${listing.unit}`
//               : "Out of Stock"}
//           </button>
//         ) : (
//           <div className="text-center py-3 bg-gray-100 rounded-lg text-gray-600 text-sm font-semibold border border-gray-200">
//             Login to Order
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default MarketplaceCard;
