import React from 'react';
import { Step, Stepper } from '../../components/stepper/Stepper';
import { CheckQuotes } from './steps/Checks';
import Finished from './steps/Finished';
import JobSelect from './steps/JobSelect';

const WizQuote = () => {

    return (
        <div className="wizard-content">
            <Stepper onComplete={()=>{}} completeButtonName='Done'>
                <Step name='Select Job'>
                    <JobSelect />
                </Step>
                <Step name='Check Quotes'>
                    <CheckQuotes />
                </Step>
                <Step name='Create Quote'>
                </Step>
                <Step name='Add Details'>
                </Step>
                <Step name='Finished'>
                    <Finished />
                </Step>
            </Stepper>
        </div>
    )
}

export default WizQuote;