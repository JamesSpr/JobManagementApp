import { useContext, useDebugValue } from "react";
import AppContext from "./AppProvider"
import { AppContextType } from "../types/types";

const useApp = () => {
    return useContext(AppContext) as AppContextType;
};

export default useApp;