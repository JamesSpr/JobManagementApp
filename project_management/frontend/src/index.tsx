import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from './App';
import { AuthProvider } from "./context/AuthProvider";
import { createRoot } from "react-dom/client";
import { AppProvider } from "./context/AppProvider";

const container = document.getElementById("app") as HTMLElement
const root = createRoot(container!);

root.render(
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
    </React.StrictMode>
);
