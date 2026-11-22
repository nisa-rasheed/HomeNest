
import { useCallback, useEffect, useRef, useState } from "react";
import axiosInstance from "../services/axiosInstance";
import "./AdminInventory.css";
import Pagination from "../components/Pagination";

const AdminInventory = () => {
    const [inventory, setInventory] = useState([]);
    const [search, setSearch] = useState("");
    const [stockFilter, setStockFilter] = useState("");
    const [page, setPage] = useState(1);
    const [count, setCount] = useState(0);
    const [appliedSearch, setAppliedSearch] = useState("");

    const [stockValues, setStockValues] = useState({});
    const [loading, setLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);
    const [error, setError] = useState("");
    

    // Keep track of the variant currently being edited.
    const editingVariantId = useRef(null);

    // Prevent overlapping inventory requests.
    const isFetching = useRef(false);

    const pageSize = 6;
    const totalPages = Math.ceil(count / pageSize);

    // Fetch inventory without disturbing the screen during auto-refresh.
    const fetchInventory = useCallback(async (showLoading = false) => {
        if (isFetching.current) {
            return;
        }

        try {
            isFetching.current = true;

            if (showLoading) {
                setLoading(true);
                setError("");
            }

            const response = await axiosInstance.get(
                "/products/admin/inventory/",
                {
                    params: {
                        page,
                        page_size: pageSize,
                        search: appliedSearch || undefined,
                        stock: stockFilter || undefined,
                    },
                                    }
            );

            const data = response.data;
            const results = data.results || [];

            setInventory(results);
            setCount(data.count || 0);

            // Update stock values from the backend.
            // Do not overwrite the value currently being edited.
            setStockValues((previous) => {
                const updatedValues = {};

                results.forEach((item) => {
                    const variantId = item.variant_id;

                    if (
                        String(editingVariantId.current) === String(variantId) &&
                        previous[variantId] !== undefined
                    ) {
                        updatedValues[variantId] = previous[variantId];
                    } else {
                        updatedValues[variantId] = item.stock;
                    }
                });

                return updatedValues;
            });

        } catch (err) {
            // Background refresh errors should not disturb the screen.
            if (showLoading) {
                setError(
                    err.response?.data?.message ||
                    "Unable to load inventory. Please try again."
                );
            }
        } finally {
            isFetching.current = false;

            if (showLoading) {
                setLoading(false);
            }
        }
    }, [page, appliedSearch, stockFilter]);

    // Normal fetch when page, search, or filter changes.
    useEffect(() => {
        fetchInventory(true);
    }, [fetchInventory]);

    // Background auto-refresh every 5 seconds.
    // No loading screen or table reload during this fetch.
    useEffect(() => {
        const interval = setInterval(() => {
            fetchInventory(false);
        }, 5000);

        return () => clearInterval(interval);
    }, [fetchInventory]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        setAppliedSearch(search.trim());
    };

    const handleStockChange = (variantId, value) => {
        editingVariantId.current = variantId;

        setStockValues((previous) => ({
            ...previous,
            [variantId]: value,
        }));

        setError("");
        
    };

    const handleUpdateStock = async (item) => {
        const newStock = Number(stockValues[item.variant_id]);

        if (
            stockValues[item.variant_id] === "" ||
            !Number.isInteger(newStock) ||
            newStock < 0
        ) {
            setError("Stock must be a valid non-negative whole number.");
            return;
        }

        try {
            setUpdatingId(item.variant_id);
            setError("");
        

            await axiosInstance.patch(
                `/products/admin/inventory/${item.variant_id}/stock/`,
                {
                    stock: newStock,
                }
            );

            

            // Stop protecting this input after a successful save.
            editingVariantId.current = null;

            // Fetch the latest backend stock without showing loading.
            await fetchInventory(false);

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to update stock. Please try again."
            );
        } finally {
            setUpdatingId(null);
        }
    };

    const formatPrice = (price) => {
        return `₹${Number(price || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    const getStockStatus = (status) => {
        switch (status) {
            case "in_stock":
                return "In Stock";
            case "low_stock":
                return "Low Stock";
            case "out_of_stock":
                return "Out of Stock";
            default:
                return status;
        }
    };

    const getStockClass = (status) => {
        switch (status) {
            case "in_stock":
                return "inventory-status in-stock";
            case "low_stock":
                return "inventory-status low-stock";
            case "out_of_stock":
                return "inventory-status out-of-stock";
            default:
                return "inventory-status";
        }
    };

    const startItem = count === 0 ? 0 : (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, count);

    return (
        <div className="admin-inventory-page">

            <div className="inventory-header">
                <div>
                    <h1>Inventory Management</h1>
                    <p>
                        Monitor product stock and update available quantities.
                    </p>
                </div>

                <div className="inventory-total">
                    <span>Total Variants</span>
                    <strong>{count}</strong>
                </div>
            </div>

            <div className="inventory-filters">

                <form
                    className="inventory-search"
                    onSubmit={handleSearch}
                >
                    <input
                        type="text"
                        placeholder="Search product name or SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <button type="submit">
                        Search
                    </button>
                </form>

                <select
                    value={stockFilter}
                    onChange={(e) => {
                        setStockFilter(e.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">All Stock</option>
                    <option value="in_stock">In Stock</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                </select>

            </div>

            {error && (
                <div className="inventory-message error-message">
                    {error}
                </div>
            )}

            
                
            

            <div className="inventory-table-container">

                <table className="inventory-table">

                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Category</th>
                            <th>SKU</th>
                            <th>Variant</th>
                            <th>Price</th>
                            <th>Available Stock</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>

                        {loading ? (
                            <tr>
                                <td colSpan="8" className="inventory-empty">
                                    Loading inventory...
                                </td>
                            </tr>
                        ) : inventory.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="inventory-empty">
                                    No inventory records found.
                                </td>
                            </tr>
                        ) : (
                            inventory.map((item) => (
                                <tr key={item.variant_id}>

                                    <td className="inventory-product-name">
                                        {item.product_name}
                                    </td>

                                    <td>{item.category || "-"}</td>

                                    <td className="inventory-sku">
                                        {item.sku}
                                    </td>

                                    <td>
                                        <span>
                                            {item.size || "-"}
                                        </span>

                                        <span className="inventory-color">
                                            {item.color && item.color !== "null"
                                                ? item.color
                                                : ""}
                                        </span>
                                    </td>

                                    <td>
                                        {formatPrice(item.price)}
                                    </td>

                                    <td>
                                        <input
                                            className="stock-input"
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={
                                                stockValues[item.variant_id] ?? ""
                                            }
                                            onChange={(e) =>
                                                handleStockChange(
                                                    item.variant_id,
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </td>

                                    <td>
                                        <span className={getStockClass(item.stock_status)}>
                                            {getStockStatus(item.stock_status)}
                                        </span>
                                    </td>

                                    <td>
                                        <button
                                            className="stock-update-button"
                                            onClick={() =>
                                                handleUpdateStock(item)
                                            }
                                            disabled={
                                                updatingId === item.variant_id ||
                                                Number(stockValues[item.variant_id]) === Number(item.stock)
                                            }
                                        >
                                            {updatingId === item.variant_id
                                                ? "Saving..."
                                                : "Update"}
                                        </button>
                                    </td>

                                </tr>
                            ))
                        )}

                    </tbody>

                </table>

            </div>

            <div className="inventory-pagination">
    <span>
        Showing {startItem}–{endItem} of {count} variants
    </span>

    <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
    />
</div>

        </div>
    );
};

export default AdminInventory;
