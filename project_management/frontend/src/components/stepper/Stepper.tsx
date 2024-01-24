import React, { FC, ReactNode, useEffect, useState, useContext, createContext } from "react"

export interface StepperProps {
    children: ReactNode
    onComplete: () => void
    completeButtonName: string
}
export const Stepper:FC<StepperProps> = ({children, onComplete, completeButtonName}) => {

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

    useEffect(() => {
        // Rerender on changes to the step components children 
        // e.g. useState prop 
        setContent(
            React.Children.map(children, (child, stepI) => {
                let childComponent = React.Children.toArray(child)[0] as JSX.Element
                return childComponent.props.children
            }) ?? []
        )
    }, [children])

    const checkThenNextStep = () => {
        if((React.Children.toArray(children)[step] as JSX.Element).props.validation) {
            if((React.Children.toArray(children)[step] as JSX.Element).props.validation()) {
                return
            }
        }
        changeStep(1)
    }

    return (
    <>
        <StepperContext.Provider value={{ content, setContent, step, setStep }}>
            <div className='stepper-content'>
                {content[step]}
            </div>
            <ol id='stepper' className="stepper">
                {children}
            </ol>
            <div className='stepper-control'>
                {
                    step > 0 &&
                    <button className="stepper-button" onClick={() => changeStep(-1)}>Previous</button>
                }
                {
                    step < React.Children.count(children)-1 ?
                    <button className="stepper-button" onClick={checkThenNextStep}>Next</button>
                    :
                    <button className="stepper-button" onClick={onComplete}>{completeButtonName}</button>
                }
            </div>
        </StepperContext.Provider>
    </>
    )
}

export interface StepProps {
    name: string
    // key: React.Key 
    description?: string
    children?: ReactNode
    validation?: () => void
}
export const Step:FC<StepProps> = ({name, description, children}) => {

    const { step, setContent } = useStepperContext();

    useEffect(() => {
        setContent(prev => [...prev, children]);
    }, [])

    useEffect(() => {
        setContent(prev => prev.map((child) => {
            return child
        }));
    }, [step, children])

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
    step: number
    setStep: (value: number) => void
}

const StepperContext = createContext<StepperContent>({
    content: [],
    setContent: () => {},
    step: 0,
    setStep: () => {},
})

const useStepperContext = () => useContext(StepperContext)
