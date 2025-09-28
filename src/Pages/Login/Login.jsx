import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../Component/logo.png";

function Login({ setIsAuthenticated }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    // Validation
    if (!email || !password || !role) {
      alert("Please fill in all fields including role");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/auth/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email,
    password,
    role,
  }),
});


      const data = await response.json();

      if (response.ok) {
        // Success - store token and user info
        localStorage.setItem("token", data.token);
        
        // Decode token to get user info (optional - you could also send user info from backend)
        const tokenPayload = JSON.parse(atob(data.token.split('.')[1]));
        localStorage.setItem("userInfo", JSON.stringify({
          id: tokenPayload.id,
          email: tokenPayload.email,
          role: tokenPayload.role
        }));

        setIsAuthenticated(true);
        
        // Show success message
        // alert(`Login successful! Welcome ${tokenPayload.role}`);
        
        // Navigate based on role (optional - you can customize this)
        if (tokenPayload.role === 'admin') {
          navigate("/dashboard");
        } else if (tokenPayload.role === 'manager') {
          navigate("/dashboard"); // or different route for managers
        } else if (tokenPayload.role === 'user') {
          navigate("/dashboard"); // or different route for users
        } else {
          navigate("/dashboard"); // default route
        }
      } else {
        // Handle API errors
        alert(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img
          src={logo}
          alt="Shakshi Kurti Logo"
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            objectFit: "cover",
            display: "block",
            margin: "0 auto 20px",
            border: "2px solid #ccc",
          }}
        />

        <form onSubmit={handleLogin} className="login-form">
          <input
            type="email"
            placeholder="Enter Email *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />

          <input
            type="password"
            placeholder="Enter Password *"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
            disabled={isLoading}
            style={{
              padding: "12px",
              marginBottom: "15px",
              border: "1px solid #ddd",
              borderRadius: "5px",
              fontSize: "16px",
              width: "100%",
              backgroundColor: isLoading ? "#f5f5f5" : "white",
              cursor: isLoading ? "not-allowed" : "pointer"
            }}
          >
            <option value="">Select Role *</option>
            <option value="admin">Admin</option>
            {/* <option value="manager">Manager</option>
            <option value="user">User</option> */}
          </select>

          <button 
            type="submit" 
            disabled={isLoading}
            style={{
              opacity: isLoading ? 0.6 : 1,
              cursor: isLoading ? "not-allowed" : "pointer"
            }}
          >
            {isLoading ? "⏳ Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;