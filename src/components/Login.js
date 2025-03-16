import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/styles.css";

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = async () => {
        if (username && password) {
            try {
                // TODO: API request to return userId
                // const response = await someApiLoginFunction(username, password);
                let response = {userId: 101}
                if (response && response.userId) {
                    localStorage.setItem("userId", response.userId);
                    navigate("/main");
                } else {
                    alert("Invalid username or password");
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
                placeholder="Username" 
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
        </div>
    );
};

export default Login;