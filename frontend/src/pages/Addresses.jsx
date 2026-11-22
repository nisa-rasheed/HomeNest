
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";
import "./Addresses.css";

const emptyAddress = {
  full_name: "",
  phone: "",
  address_line: "",
  city: "",
  state: "Kerala",
  district: "",
  pincode: "",
  is_default: false,
};
const keralaDistricts = [
  "Alappuzha",
  "Ernakulam",
  "Idukki",
  "Kannur",
  "Kasaragod",
  "Kollam",
  "Kottayam",
  "Kozhikode",
  "Malappuram",
  "Palakkad",
  "Pathanamthitta",
  "Thiruvananthapuram",
  "Thrissur",
  "Wayanad",
];
function Addresses({ onBack, onContinueShopping }) {
  const location = useLocation();
const navigate = useNavigate();

const cameFromCheckout = location.state?.from === "/checkout";

const handleBack = () => {
  if (cameFromCheckout) {
    navigate("/checkout", { state: location.state?.checkoutState });
  } else {
    navigate("/profile");
  }
};
  const [addresses, setAddresses] = useState([]);
  const [profileDetails, setProfileDetails] = useState({
    full_name: "",
    phone: "",
  });
  const [formData, setFormData] = useState(emptyAddress);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProfileDetails = async () => {
    try {
      const response = await axiosInstance.get("/profile/");

      setProfileDetails({
        full_name: response.data.full_name || "",
        phone: response.data.phone || "",
      });
    } catch (err) {
      console.error("Unable to load profile details:", err);
    }
  };

  const fetchAddresses = async () => {
    try {
      const response = await axiosInstance.get("/addresses/");
      const data = Array.isArray(response.data)
          ? response.data
          : response.data?.results || response.data?.addresses || [];

        setAddresses(data);
      setError("");
    } catch (err) {
      setError("Unable to load saved addresses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchProfileDetails();
      await fetchAddresses();
    };

    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAdd = () => {
    setFormData({
      ...emptyAddress,
      full_name: profileDetails.full_name,
      phone: profileDetails.phone,
    });

    setEditingId(null);
    setShowForm(true);
    setMessage("");
    setError("");
  };

  const handleEdit = (address) => {
    setFormData({
      full_name: address.full_name || "",
      phone: address.phone || "",
      address_line: address.address_line || "",
      city: address.city || "",
      state: address.state || "Kerala",
      district: address.district || "",
      pincode: address.pincode || "",
      is_default: address.is_default || false,
    });

    setEditingId(address.id);
    setShowForm(true);
    setMessage("");
    setError("");
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyAddress);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      if (editingId) {
        await axiosInstance.patch(
          `/addresses/${editingId}/`,
          formData
        );

        setMessage("Address updated successfully!");
      } else {
        await axiosInstance.post("/addresses/", formData);

        setMessage("Address added successfully!");
      }

      handleCancel();
      await fetchAddresses();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save address. Please check the details."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    setSelectedAddressId(id);
    setShowDeletePopup(true);
    setMessage("");
    setError("");
  };

  const handleCancelDelete = () => {
    setShowDeletePopup(false);
    setSelectedAddressId(null);
  };

  const confirmDelete = async () => {
    if (!selectedAddressId) return;

    setDeleting(true);
    setError("");
    setMessage("");

    try {
      await axiosInstance.delete(
        `/addresses/${selectedAddressId}/`
      );

      setShowDeletePopup(false);
      setSelectedAddressId(null);
      setMessage("Address deleted successfully!");

      await fetchAddresses();
    } catch (err) {
      setError("Unable to delete address.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSetDefault = async (address) => {
    try {
      await axiosInstance.patch(`/addresses/${address.id}/`, {
        is_default: true,
      });

      setMessage("Default address updated successfully!");
      await fetchAddresses();
    } catch (err) {
      setError("Unable to update default address.");
    }
  };

  if (loading) {
    return <div className="address-loading">Loading addresses...</div>;
  }

  return (
    <div className="address-page">
      <header className="address-header">
        <div className="address-logo">HomeNest</div>

        <button
          type="button"
          className="address-back-btn"
          onClick={handleBack}
        >
          {cameFromCheckout ? "Back to Checkout" : "Back to Profile"}
        </button>
      </header>

      <main className="address-container">
        <div className="address-heading">
          <p>YOUR DELIVERY DETAILS</p>
          <h1>Saved Addresses</h1>
          <span>Manage your delivery addresses</span>
        </div>

        {message && (
          <p className="address-success">{message}</p>
        )}

        {error && (
          <p className="address-error">{error}</p>
        )}

        {!showForm && (
          <button
            type="button"
            className="add-address-btn"
            onClick={handleAdd}
          >
            + Add New Address
          </button>
        )}

        {showForm && (
          <form className="address-form" onSubmit={handleSubmit}>
            <h2>
              {editingId ? "Edit Address" : "Add New Address"}
            </h2>

            <div className="address-fields">
              <div className="address-field">
                <label>Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="address-field">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div className="address-field address-full-width">
                <label>Address</label>
                <textarea
                  name="address_line"
                  value={formData.address_line}
                  onChange={handleChange}
                  placeholder="House name, street, area"
                  required
                />
              </div>

              <div className="address-field">
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                  required
                />
              </div>

              <div className="address-field">
                <label>State</label>
                <select
                  name="state"
                  value="Kerala"
                  disabled
                >
                <option value="Kerala">Kerala</option>
                </select>
              </div>

              <div className="address-field">
                <label>District</label>
                <select
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select District</option>

                  {keralaDistricts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>

              <div className="address-field">
                <label>PIN Code</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="Enter 6 digit PIN code"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  required
                />
              </div>
            </div>

            <label className="default-checkbox">
              <input
                type="checkbox"
                name="is_default"
                checked={formData.is_default}
                onChange={handleChange}
              />
              Set as default address
            </label>

            <div className="address-form-actions">
              <button
                type="submit"
                className="save-address-btn"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Address"}
              </button>

              <button
                type="button"
                className="cancel-address-btn"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {!showForm && (
          <section className="address-list">
            {addresses.length === 0 ? (
              <p className="no-address">
                No saved addresses yet. Add your first address.
              </p>
            ) : (
              addresses.map((address) => (
                <div className="address-card" key={address.id}>
                  <div className="address-card-heading">
                    <h3>{address.full_name}</h3>

                    {address.is_default && (
                      <span className="default-badge">
                        Default
                      </span>
                    )}
                  </div>

                  <p>{address.phone}</p>
                  <p>{address.address_line}</p>

                  <p>
                      {address.city}, {address.district}, {address.state} - {address.pincode}
                  </p>

                  <div className="address-card-actions">
                    <button
                      type="button"
                      onClick={() => handleEdit(address)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="delete-address-btn"
                      onClick={() => handleDelete(address.id)}
                    >
                      Delete
                    </button>

                    {!address.is_default && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(address)}
                      >
                        Set as Default
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        <button
          type="button"
          className="continue-address-btn"
          onClick={onContinueShopping}
        >
          Continue Shopping
        </button>
      </main>

      {showDeletePopup && (
        <div className="delete-popup-overlay">
          <div
            className="delete-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-popup-title"
          >
            <div className="delete-popup-icon">!</div>

            <h2 id="delete-popup-title">Delete Address?</h2>

            <p>
              Are you sure you want to delete this address?
              This action cannot be undone.
            </p>

            <div className="delete-popup-actions">
              <button
                type="button"
                className="delete-cancel-btn"
                onClick={handleCancelDelete}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-confirm-btn"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Address"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Addresses;
