import { ContractorType } from "../../../types/types"
import { Grid } from "@mui/material"

const FormReview = ({value}: {
    value: ContractorType, 
}) => {
    return (
        <div className="formReviewContainer">
            <div>
                <h2>{value.name}</h2>
                <p><b>ABN:</b> {value.abn}</p>
                <p><b>Bank Name:</b> {value.bankAccountName}</p>
                <p><b>BSB:</b> {value.bsb}</p>
                <p><b>Account Number:</b> {value.bankAccountNumber}</p>  
                <p><b>Address:</b> {value.contacts?.[0].address},  {value.contacts?.[0].locality}  {value.contacts?.[0].state}  {value.contacts?.[0].postcode} </p>  
            </div>
        </div>
    )
}

export default FormReview;