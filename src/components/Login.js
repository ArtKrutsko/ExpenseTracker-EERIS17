import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/styles.css";

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = async () => {
        if (username && password) {
            try {
                const response = await fetch("http://127.0.0.1:5000/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: username, password: password }),
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("role", data.role);  // Save role
                    navigate("/main");
                } else {
                    alert(data.error || "Invalid username or password");
                }
            } catch (error) {
                console.error("Login failed", error);
                alert("Login request failed. Please try again.");
            }
        } else {
            alert("Please enter valid credentials");
        }
    };

    return (
        <div className="container">
            <h2>Login</h2>
            <input 
                type="text" 
                className="input-field" 
                placeholder="Email" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
            />
            <input 
                type="password" 
                className="input-field" 
                placeholder="Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={handleLogin}>Login</button>

            {/* Register link */}
            <p style={{ marginTop: "10px" }}>
                Don't have an account? <Link to="/register">Register here</Link>
            </p>
        </div>
    );
};

export default Login;
