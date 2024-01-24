import { ContractorType } from "../../../types/types"
import { InputField } from "../../../components/Components"
import { Grid } from "@mui/material"
import { FieldErrorContactType, FieldErrorType } from "./Dialog"

const ContactDetailsForm = ({value, setValue, fieldError, setFieldError }: {
    value: ContractorType, 
    fieldError: FieldErrorType, 
    setFieldError: React.Dispatch<React.SetStateAction<FieldErrorType>>,
    setValue: React.Dispatch<React.SetStateAction<ContractorType>>,
}) => {
    const handleDialogChange = (e: { target: { name: string; value: string | any[]; }; }) => {
        if(fieldError.contacts[0][e.target.name as keyof FieldErrorContactType]) {
            setFieldError(prev => ({...prev, contacts: prev.contacts?.map((c, idx) => {
                if(0 == idx) {
                    return {...c, [e.target.name]: false}
                }
                return c
            })}))
        }

        setValue(prev => ({...prev, contacts: prev.contacts?.map((contact, idx) => {
            if(idx === 0) {
                return {...contact, [e.target.name]: e.target.value}
            }
            return contact
        })}))
    }
    
    return (
        <Grid container spacing={1} direction='column' alignItems='center'>
            <Grid item xs={12}>
                <InputField
                    type="text"
                    label="Contact Name" name="contactName" 
                    error={fieldError.contacts[0].contactName} 
                    value={value.contacts?.[0].contactName} 
                    onChange={e => handleDialogChange(e)} maxLength={25}
                />
            </Grid>
            <Grid item xs={12}>
                <InputField
                    type="text"
                    label="Street" name="address" 
                    error={fieldError.contacts[0].address} 
                    value={value.contacts?.[0].address} 
                    onChange={e => handleDialogChange(e)} maxLength={255}
                />
            </Grid>
            <Grid item xs={12}>
                <InputField
                    type="text"
                    label="City" name="locality" 
                    error={fieldError.contacts[0].locality} 
                    value={value.contacts?.[0].locality} 
                    onChange={handleDialogChange} maxLength={255}
                />
            </Grid>
            <Grid item xs={12}>
                <InputField
                    type="select" 
                    error={fieldError.contacts[0].state} 
                    label="State" name="state" 
                    value={value.contacts?.[0].state}
                    onChange={handleDialogChange} maxLength={32}
                >
                    <option>NSW</option>
                    <option>ACT</option>
                    <option>NT</option>
                    <option>QLD</option>
                    <option>SA</option>
                    <option>TAS</option>
                    <option>VIC</option>
                    <option>WA</option>
                </InputField>
            </Grid>
            <Grid item xs={12}>
                <InputField
                    type="text" 
                    error={fieldError.contacts[0].postcode} 
                    label="Postcode" name="postcode" 
                    value={value.contacts?.[0].postcode} 
                    onChange={handleDialogChange} maxLength={4} 
                />
            </Grid>
            <Grid item xs={12}>
                <InputField
                    type="text" 
                    error={fieldError.contacts[0].country} 
                    label="Country" name="country" 
                    value={value.contacts?.[0].country} 
                    onChange={handleDialogChange}
                />
            </Grid>

        </Grid>
    )
}

export default ContactDetailsForm;