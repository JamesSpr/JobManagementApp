import React, { useState, createContext } from "react";

const EstimateContext = createContext([]);

export const EstimateProvider = ({ children }) => {
    const [selectedEstimate, setSelectedEstimate] = useState({});
    const [estimate, setEstimate] = useState({});
    const [estimateSet, setEstimateSet] = useState([]);

    return (
        <EstimateContext.Provider value={{ estimate, estimateSet, setEstimate, setEstimateSet, selectedEstimate, setSelectedEstimate }}> 
            { children } 
        </EstimateContext.Provider>
    )
}

export default EstimateContext;