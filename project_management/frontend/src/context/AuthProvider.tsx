import React, { ReactNode, createContext, useState } from "react";
import { AuthContextType, IAuth } from '../types/types';

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
    const [ auth, setAuth ] = useState<IAuth>();

    return (
        <AuthContext.Provider value={{auth, setAuth}}> 
            { children } 
        </AuthContext.Provider>
    )
}

export default AuthContext;