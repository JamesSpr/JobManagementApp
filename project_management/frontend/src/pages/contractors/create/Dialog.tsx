import { useState } from "react"
import { ContractorType } from "../../../types/types"
import { BasicDialog } from "../../../components/Components"
import { Step, Stepper } from "../../../components/stepper/Stepper"
import BankDetailsForm from "./BankDetailsForm"
import ContactDetailsForm from "./ContactForm"
import FormReview from "./FormReview"

export type FieldErrorType = {
    name: boolean
    abn: boolean
    bsb: boolean
    bankAccountName: boolean
    bankAccountNumber: boolean
    contacts: FieldErrorContactType[]
}

export type FieldErrorContactType = {
    contactName: boolean
    address: boolean
    locality: boolean
    state: boolean
    postcode: boolean
    country: boolean
}

const CreateContractorDialog = ({ newContractor, setNewContractor, open, onCreate, onClose, inputMask, waiting }: {
    open:boolean
    onCreate: (value: ContractorType) => void
    onClose: (event: any, reason: string, value: ContractorType) => void
    newContractor: ContractorType
    setNewContractor: React.Dispatch<React.SetStateAction<ContractorType>>
    inputMask: (name: string, value: any) => any
    waiting: boolean
}) => {
    const [fieldError, setFieldError] = useState<FieldErrorType>({
        name: false, abn: false, bsb: false, bankAccountName: false, bankAccountNumber: false, contacts: [{
            contactName: false, address: false, locality: false, state: false, postcode: false, country: false
        }]
    });

    const handleClose = (event?: any, reason?: any) => {
        setFieldError({name: false, abn: false,bsb: false, bankAccountName: false, bankAccountNumber: false, contacts: [
            {contactName: false, address: false, locality: false, state: false, postcode: false, country: false}
        ]});
        onClose(event, reason, newContractor);
    }

    const handleCreate = () => {        
        onCreate(newContractor);
    }

    const validateBankDetails = () => {
        let error = false;
        if(newContractor.abn.length < 14) {
            setFieldError(prev => ({...prev, abn: true}))
            error = true;
        }
        if(newContractor.bsb.length < 7) {
            setFieldError(prev => ({...prev, bsb: true}))
            error = true;
        }
        if(newContractor.bankAccountNumber.length < 6) {
            setFieldError(prev => ({...prev, bankAccountNumber: true}))
            error = true;
        }

        return error
    }

    const validateContactDetails = () => {
        let error = false;
        let contractorContacts = (newContractor.contacts ?? [])
        const required = ['contactName', 'address' ,'locality', 'state', 'postcode', 'country']

        for(let i = 0; i < contractorContacts.length; i++) {
            for(let item in contractorContacts[i]) {
                if(required.includes(item) && contractorContacts[i][item as keyof FieldErrorContactType] === "") {
                    error = true
                    setFieldError(prev => ({...prev, contacts: prev.contacts?.map((c, idx) => {
                        if(i == idx) {
                            return {...c, [item]: true}
                        }
                        return c
                    })}))
                }
            }
        }

        return error
    }

    return(
        <BasicDialog open={open} close={handleClose} 
            title='Create New Contractor' dialogActions={<></>}
            fullWidth maxWidth='sm' center
        >
            <Stepper onComplete={handleCreate} completeButtonName='Create' waiting={waiting}>
                <Step name='Bank Details' key={'bankStep'} validation={validateBankDetails}>
                    <BankDetailsForm
                        value={newContractor} setValue={setNewContractor} 
                        fieldError={fieldError} setFieldError={setFieldError} 
                        inputMask={inputMask}
                    />
                </Step>
                <Step name='Contact' key={'contactStep'} validation={validateContactDetails}>
                    <ContactDetailsForm
                        value={newContractor} setValue={setNewContractor} 
                        fieldError={fieldError} setFieldError={setFieldError} 
                    />
                </Step>
                <Step name='Review' key={'reviewStep'}>
                    <FormReview value={newContractor} />
                </Step>
            </Stepper>
            
        </BasicDialog>
    )
}

export default CreateContractorDialog;