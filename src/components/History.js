import React, { useState, useEffect } from "react";
import "../styles/styles.css";

const History = () => {
    const [expenses, setExpenses] = useState([]);

    useEffect(() => {
        fetch("http://127.0.0.1:5000/expenses", {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        })
        .then(response => response.json())
        .then(data => setExpenses(data))
        .catch(error => console.error("Error fetching expenses:", error));
    }, []);

    return (
        <div>
            <h2>Expense History</h2>
            <ul>
                {expenses.map(expense => (
                    <li key={expense.id}>{expense.category}: ${expense.amount}</li>
                ))}
            </ul>
        </div>
    );
};

export default History;
