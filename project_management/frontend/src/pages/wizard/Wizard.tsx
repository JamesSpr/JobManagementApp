import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Wizard = () => {
    const navigate = useNavigate();

    type Wizard = {
        quote: boolean
        invoice: boolean
    }

    const [wizard, setWizard] = useState<Wizard>({'quote':false, 'invoice':false})

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        const name = event.currentTarget.name
        // setWizard(prev => ({...prev, [name]: true}))
        navigate("/wizard/" + name);
    }

    return (
    <>
        <div>
            <h1>Welcome to the Wizard</h1>
            <p>Please select a task you wish to complete</p>
        </div>
        <div className='wizard-selector'>
            <button className="wiz-button"  name="invoice" onClick={handleClick}>
                <img src={"/static/images/invoice.png"} />
            </button>
            <button className="wiz-button" name="quote" onClick={handleClick}>
                <img src={"/static/images/quote.png"} />
            </button>
        </div>
    </>
    )
}

export default Wizard;