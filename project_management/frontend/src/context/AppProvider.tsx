import React, { ReactNode, createContext, useState, useEffect } from "react";
import { AppContextType, AppType } from '../types/types';
import { useLocation } from "react-router-dom";

const AppContext = createContext<AppContextType>({app: {title:"", subTitle:""}, setApp: () => {}});

export const AppProvider = ({ children }: { children?: ReactNode }) => {
    const [app, setApp] = useState<AppType>();

    const location = useLocation();
    useEffect(() => {
        setApp(prev => ({...prev, title: '', subTitle: ''}));
    }, [location]);
    
    return (
        <AppContext.Provider value={{app, setApp}}> 
            { children } 
        </AppContext.Provider>
    )
}

export default AppContext;