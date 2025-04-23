import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Main from "./components/Main";
import History from "./components/History";
import Register from "./components/Register"; // 🧠 Add this line

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/register" element={<Register />} /> {/* 🆕 */}
                <Route path="/main" element={<Main />} />
                <Route path="/history" element={<History />} />
            </Routes>
        </Router>
    );
}

export default App;
