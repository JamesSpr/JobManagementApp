import { ContractorType } from "../../../types/types"
import { InputField } from "../../../components/Components"
import { Grid } from "@mui/material"
import { FieldErrorType } from "./Dialog"

const BankDetailsForm = ({value, setValue, fieldError, setFieldError, inputMask }: {
    value: ContractorType, 
    fieldError: FieldErrorType, 
    setFieldError: React.Dispatch<React.SetStateAction<FieldErrorType>>,
    setValue: React.Dispatch<React.SetStateAction<ContractorType>>,
    inputMask: (name: string, value: any) => any
}) => {

    const handleDialogChange = (e: { target: { name: string; value: string | any[]; }; }) => {
        if(e.target.name === 'abn' && fieldError['abn'] && e.target.value.length == 14) {
            setFieldError((prev: FieldErrorType) => ({...prev, 'abn': false}))
        }
        if(e.target.name === 'bsb' && fieldError['bsb'] && e.target.value.length == 7) {
            setFieldError((prev: FieldErrorType) => ({...prev, 'bsb': false}))
        }
        if(e.target.name === 'bankAccountNumber' && fieldError['bankAccountNumber'] && e.target.value.length >= 6) {
            setFieldError((prev: FieldErrorType) => ({...prev, 'bankAccountNumber': false}))
        }
                
        setValue(prev => ({...prev, [e.target.name]: inputMask(e.target.name, e.target.value)}))
    }

    return (
        <Grid container spacing={1} direction='column' alignItems='center'>
            <Grid item xs={12}>
                <InputField
                    type="text" 
                    error={fieldError.name} 
                    label="Contractor" name="name" 
                    value={value.name} 
                    onChange={e => handleDialogChange(e)} maxLength={50}
                />
            </Grid>
            <Grid item xs={12}>
                <InputField
                    type="text" 
                    error={fieldError.abn} 
                    label="ABN" name="abn" 
                    value={value.abn} 
                    onChange={handleDialogChange} maxLength={14}
                />
            </Grid>
            <Grid item xs={12}>
                <InputField
                    type="text" 
                    error={fieldError.bankAccountName} 
                    label="Bank Account Name" name="bankAccountName" 
                    value={value.bankAccountName} 
                    onChange={handleDialogChange} maxLength={32}
                />
            </Grid>
            <Grid item xs={12}>
                <InputField
                    type="text" 
                    error={fieldError.bsb} 
                    label="BSB" name="bsb" 
                    value={value.bsb} 
                    onChange={handleDialogChange} maxLength={7} 
                    style={{width: '75px', marginRight: '5px'}}
                />
                <InputField
                    type="text" 
                    error={fieldError.bankAccountNumber} 
                    label="Account Number" name="bankAccountNumber" 
                    value={value['bankAccountNumber']} 
                    onChange={handleDialogChange} maxLength={9} 
                    style={{width: '120px', marginLeft: '5px'}}
                />
            </Grid>
        </Grid>
    )
}

export default BankDetailsForm;