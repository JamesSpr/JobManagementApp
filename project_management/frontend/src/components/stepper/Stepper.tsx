import React, { FC, ReactNode, useEffect, useState, useContext, createContext } from "react"

export interface StepperProps {
    children: ReactNode;
}
export const Stepper:FC<StepperProps> = ({children}) => {

    let stepper = document.getElementById('stepper');
    const [step, setStep] = useState(0);
    const [content, setContent] = useState<ReactNode[]>([]);

    useEffect(() => {
        stepper = document.getElementById('stepper');
        stepper?.children[0].setAttribute('class', "stepper-item active");
    }, [])

    
    const changeStep = (value: number) => {
        if(value > 0) {
            if(stepper && step < stepper.childElementCount -1) {
                setStep(step + value);
            }
        }
        else {
            if(step > 0) {
                setStep(step - 1);
            }
        }
    }

    useEffect(() => {
        if(stepper) {
            for(let i=0; i < stepper?.childElementCount; i++) {
                // Change the css to show active steps
                if(i === step) {
                    stepper?.children[i].setAttribute('class', "stepper-item active");
                }
                else if(i < step) {
                    stepper?.children[i].setAttribute('class', "stepper-item complete");
                }
                else {
                    stepper?.children[i].setAttribute('class', 'stepper-item');
                }
            }
        }
    }, [step])

    return (
    <>
        <StepperContext.Provider value={{ content, setContent }}>
            <div className='stepper-content'>
                {content[step]}
            </div>
            <ol id='stepper' className="stepper">
                {children}
            </ol>
            <div className='stepper-control'>
                <button className="stepper-button" onClick={() => changeStep(-1)}>Previous</button>
                <button className="stepper-button" onClick={() => changeStep(1)}>Next</button>
            </div>
        </StepperContext.Provider>
    </>
    )
}

export interface StepProps {
    name: string;
    description?: string;
    children?: ReactNode;
}
export const Step:FC<StepProps> = ({name, description, children}) => {

    const { setContent } = useStepperContext();

    useEffect(() => {
        setContent(prev => [...prev, children]);
    }, [])

    return (
    <>
        <li className="stepper-item">
            <h3 className="stepper-title">{name}</h3>
            <p className="stepper-desc">{description}</p>
        </li>
    </>
    );
}

// Context
interface StepperContent {
    content: ReactNode[];
    setContent: (rn: (value: ReactNode[]) => ReactNode[]) => void;
}

const StepperContext = createContext<StepperContent>({
    content: [],
    setContent: () => {},
})

const useStepperContext = () => useContext(StepperContext)
