import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ReactDOM from "react-dom";
import App from './App';
import { AuthProvider } from "./context/AuthProvider";
import { AppProvider } from "./context/AppProvider";

ReactDOM.render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <AppProvider>
                    <Routes>
                        <Route path="/*" element={<App />}/>
                    </Routes>
                </AppProvider>
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>,
    document.getElementById("app")
);
