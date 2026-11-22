
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";

import "./Profile.css";
import { Camera } from "lucide-react";

function Profile({
  refreshCartCount,
  refreshWishlistCount,
  onWalletClick,
  onAddressesClick,
  onChangeEmailClick,
  onChangePasswordClick,
  onContinueShopping,
  onLogout,
}) {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    image: null,
  });

  const [previewImage, setPreviewImage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);
  const [error, setError] = useState("");

  const getImageUrl = (image) => {
    if (!image) return "";

    return image.startsWith("http")
      ? image
      : `http://127.0.0.1:8000${image}`;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axiosInstance.get("/profile/");

        setProfile({
          full_name: response.data.full_name || "",
          email: response.data.email || "",
          phone: response.data.phone || "",
          image: response.data.image || null,
        });

        setPreviewImage(getImageUrl(response.data.image));
      } catch (err) {
        setError("Unable to load profile details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    if (refreshCartCount) refreshCartCount();
    if (refreshWishlistCount) refreshWishlistCount();
  }, [refreshCartCount, refreshWishlistCount]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file.");
        e.target.value = "";
        return;
      }

      if (previewImage.startsWith("blob:")) {
        URL.revokeObjectURL(previewImage);
      }

      setSelectedImage(file);
      setPreviewImage(URL.createObjectURL(file));
      setError("");
    }

    e.target.value = "";
  };

  const handleRemoveImage = async () => {
    setRemovingImage(true);
    setError("");

    try {
      const response = await axiosInstance.patch("/profile/", {
        remove_image: "true",
      });

      const updatedProfile = response.data.user;

      setProfile({
        full_name: updatedProfile.full_name || "",
        email: updatedProfile.email || "",
        phone: updatedProfile.phone || "",
        image: updatedProfile.image || null,
      });

      if (previewImage.startsWith("blob:")) {
        URL.revokeObjectURL(previewImage);
      }

      setPreviewImage("");
      setSelectedImage(null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to remove profile photo. Please try again."
      );
    } finally {
      setRemovingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append("full_name", profile.full_name);
      formData.append("phone", profile.phone);

      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      const response = await axiosInstance.patch(
        "/profile/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const updatedProfile = response.data.user;

      setProfile({
        full_name: updatedProfile.full_name || "",
        email: updatedProfile.email || "",
        phone: updatedProfile.phone || "",
        image: updatedProfile.image || null,
      });

      if (previewImage.startsWith("blob:")) {
        URL.revokeObjectURL(previewImage);
      }

      setPreviewImage(getImageUrl(updatedProfile.image));
      setSelectedImage(null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
   const refreshToken = sessionStorage.getItem("refresh_token");

    try {
      if (refreshToken) {
        await axiosInstance.post("/logout/", {
          refresh: refreshToken,
        });
      }
    } catch (err) {
      console.error("Logout API error:", err);
    } finally {
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("refresh_token");

      if (onLogout) onLogout();
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="profile-page">

      

      <main className="profile-container">

        <div className="profile-heading">
          <p>PERSONAL SANCTUARY</p>
          <h1>My Profile</h1>
          <span>Manage your personal information</span>
        </div>

        <form className="profile-card" onSubmit={handleSubmit}>

          {/* Profile Photo */}
          <div className="profile-photo-section">

            <div className="profile-photo-wrapper">

              <div className="profile-photo">
                {previewImage ? (
                  <img src={previewImage} alt="Profile" />
                ) : (
                  <span>
                    {profile.full_name
                      ? profile.full_name.charAt(0).toUpperCase()
                      : "U"}
                  </span>
                )}
              </div>

              <label
                htmlFor="upload-profile-photo"
                className="profile-camera-btn"
                title="Change Profile Photo"
              >
                <Camera size={15} />
              </label>

            </div>

            <input
              type="file"
              id="upload-profile-photo"
              accept="image/*"
              onChange={handleImageChange}
              hidden
            />

            {previewImage && (
              <button
                type="button"
                className="remove-profile-photo-text"
                onClick={handleRemoveImage}
                disabled={removingImage || saving}
              >
                {removingImage ? "Removing..." : "Remove Photo"}
              </button>
            )}

          </div>

          {/* Profile Options */}
          <div className="profile-options">

            <button
              type="button"
              onClick={onWalletClick}
              className="profile-option"
            >
              <span>My Wallet</span>
              <span>→</span>
            </button>

            <button
              type="button"
              onClick={onAddressesClick}
              className="profile-option"
            >
              <span>Saved Addresses</span>
              <span>→</span>
            </button>

            <button
              type="button"
              onClick={onChangeEmailClick}
              className="profile-option"
            >
              <span>Change Email</span>
              <span>→</span>
            </button>

            <button
              type="button"
              onClick={onChangePasswordClick}
              className="profile-option"
            >
              <span>Change Password</span>
              <span>→</span>
            </button>

          </div>

          {/* Profile Details */}
          <div className="profile-form-fields">

            <div className="profile-field">
              <label>Full Name</label>
              <input
                type="text"
                name="full_name"
                value={profile.full_name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="profile-field">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={profile.email}
                readOnly
              />
            </div>

            <div className="profile-field">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
              />
            </div>

          </div>

          {/* Error Message Only */}
          {error && (
            <p className="profile-error">{error}</p>
          )}

          <button
            type="submit"
            className="save-profile-btn"
            disabled={saving || removingImage}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

        </form>

        <button
          className="continue-shopping-btn"
          onClick={onContinueShopping}
          type="button"
        >
          Continue Shopping
        </button>

      </main>
    </div>
  );
}

export default Profile;
