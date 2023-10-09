import React, { FC, ReactNode, useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { InputField } from "../../components/Components";
import { ClientType, SnackType } from "../../types/types";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { usePrompt } from "../../hooks/promptBlocker";
import { Grid } from "@mui/material";


const Home = ({client, details, setDetails, setUpdateRequired, setSnack }: {
    client: string | undefined,
    details: ClientType,
    setDetails: React.Dispatch<React.SetStateAction<ClientType>>,
    setUpdateRequired: React.Dispatch<React.SetStateAction<boolean>>
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
}) => {

    const handleInputChange = (e: { target: { name: any; value: any; }; }) => {
        setDetails((prev: any) => ({...prev, [e.target.name]: e.target.value}));
        setUpdateRequired(true);
    }

    return (
    <>
        <Grid container spacing={1} direction={'column'} alignItems={"center"} justifyContent={"center"}>
            <Grid item xs={12}>
                Client Details Page
            </Grid>
            <Grid item xs={12}>
                {/* <InputField type="text" label="Name" name="name" value={details.name} onChange={e => handleInputChange(e)}/> */}
                <InputField type="text" label="Display Name" name="displayName" value={details?.displayName ?? ""} onChange={handleInputChange}/>
            </Grid>
        </Grid>
    </>    
    )
}

export default Home