import React, { createContext, useState } from "react";
import { AuthContextType, IAuth } from '../types/types';

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<React.ReactNode> = ({ children }) => {
    const [ auth, setAuth ] = useState<IAuth>();

    return (
        <AuthContext.Provider value={{ auth, setAuth}}> 
            { children } 
        </AuthContext.Provider>
    )
}

export default AuthContext;