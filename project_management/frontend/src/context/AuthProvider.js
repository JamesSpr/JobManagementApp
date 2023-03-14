import React, { createContext, useState } from "react";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState({});
    const [userPreferences, setUserPreferences] = useState({sidebar: false});

    return (
        <AuthContext.Provider value={{ auth, setAuth, userPreferences, setUserPreferences }}> 
            { children } 
        </AuthContext.Provider>
    )
}

export default AuthContext;