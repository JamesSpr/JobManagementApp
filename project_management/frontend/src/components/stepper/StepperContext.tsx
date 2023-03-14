import React, { createContext, ReactNode, useContext } from "react";

export interface StepperContent {
    content: ReactNode[];
    setContent: (rn: (value: ReactNode[]) => ReactNode[]) => void;
}

export const StepperContext = createContext<StepperContent>({
    content: [],
    setContent: () => {},
})

export const useStepperContext = () => useContext(StepperContext)