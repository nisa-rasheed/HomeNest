
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";
import "./CustomerDetails.css";

function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      setLoading(true);
      setError("");
      setImageFailed(false);

      try {
        const response = await axiosInstance.get(
          `/api/admin/customers/${id}/`
        );

        setCustomer(response.data.customer);
        setAddresses(response.data.addresses || []);
      } catch (err) {
        console.error("Customer details error:", err);

        setError(
          err.response?.data?.detail ||
            "Unable to load customer details."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerDetails();
  }, [id]);

  const formatDate = (date) => {
    if (!date) return "N/A";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="customer-details-page">
        <p className="customer-details-message">
          Loading customer details...
        </p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="customer-details-page">
        <p className="customer-details-error">
          {error || "Customer not found."}
        </p>

        <button
          className="customer-back-button"
          onClick={() => navigate("/admin-customers")}
        >
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div className="customer-details-page">
      <header className="customer-details-header">
        <div>
          <p className="customer-details-subtitle">
            HOMENEST ADMIN PORTAL
          </p>

          <h1>Customer Details</h1>

          <p>View complete customer information.</p>
        </div>

        <button
          className="customer-back-button"
          onClick={() => navigate("/admin-customers")}
        >
          Back to Customers
        </button>
      </header>

      <main className="customer-details-content">
        <section className="customer-profile-card">
          <div className="customer-profile-top">

            {customer.image && !imageFailed ? (
              <img
                className="customer-profile-image"
                src={
                  customer.image.startsWith("http")
                    ? customer.image
                    : `http://127.0.0.1:8000${customer.image}`
                }
                alt="Customer Profile"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="customer-profile-fallback">
                {(customer.full_name || "C")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <div>
              <h2>{customer.full_name || "N/A"}</h2>

              <p>Customer ID: #{customer.id}</p>

              <span
                className={`customer-details-status ${
                  customer.is_active ? "active" : "blocked"
                }`}
              >
                {customer.is_active ? "Active" : "Blocked"}
              </span>
            </div>
          </div>
        </section>

        <section className="customer-info-card">
          <h2>Personal Information</h2>

          <div className="customer-info-grid">
            <div>
              <span>Customer ID</span>
              <strong>#{customer.id}</strong>
            </div>

            <div>
              <span>Full Name</span>
              <strong>{customer.full_name || "N/A"}</strong>
            </div>

            <div>
              <span>Email Address</span>
              <strong>{customer.email || "N/A"}</strong>
            </div>

            <div>
              <span>Phone Number</span>
              <strong>{customer.phone || "N/A"}</strong>
            </div>

            <div>
              <span>Registered Date</span>
              <strong>{formatDate(customer.created_at)}</strong>
            </div>

            <div>
              <span>Account Status</span>
              <strong>
                {customer.is_active ? "Active" : "Blocked"}
              </strong>
            </div>
          </div>
        </section>

        <section className="customer-info-card">
          <h2>Address Details</h2>

          {addresses.length === 0 ? (
            <p className="customer-no-address">
              No address added by this customer.
            </p>
          ) : (
            <div className="customer-address-list">
              {addresses.map((address) => (
                <div
                  className="customer-address-card"
                  key={address.id}
                >
                  {address.is_default && (
                    <span className="customer-default-label">
                      Default Address
                    </span>
                  )}

                  <h3>{address.full_name || "N/A"}</h3>

                  <p>{address.phone || "N/A"}</p>
                  <p>{address.address_line || "N/A"}</p>

                  <p>
                    {[
                      address.city,
                      address.state,
                      address.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default CustomerDetails;
