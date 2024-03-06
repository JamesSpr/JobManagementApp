import React, { FC, ReactNode, useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { Footer, ProgressIconButton, SnackBar, TabComponent, Tooltip } from "../../components/Components";
import { ClientType, ContactType, LocationType, RegionType, SnackType } from "../../types/types";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { usePrompt } from "../../hooks/promptBlocker";

import { IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';

import useApp from "../../context/useApp";
import Home from "./Home";
import Contacts from "./Contacts";
import Locations from "./Locations";
import Regions from "./Regions";


export interface ClientCreateDialogType {
    Locations: boolean,
    Contacts: boolean,
    Regions: boolean
}

const Client = () => {

    const { setApp } = useApp();
    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();
    const { client } = useParams();

    const [details, setDetails] = useState<ClientType>({id:'', name:'', displayName:'', abn:''})
    const [contacts, setContacts] = useState<ContactType[]>([]);
    const [locations, setLocations] = useState<LocationType[]>([]);
    const [regions, setRegions] = useState<RegionType[]>([]);
    
    const [snack, setSnack] = useState<SnackType>({active: false, variant: 'info', message: ''})
    const [updateRequired, setUpdateRequired] = useState(false);
    const [waiting, setWaiting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [createDialog, setCreateDialog] = useState<ClientCreateDialogType>({Locations: false, Contacts: false, Regions: false})

    if(!client){
        client === "" ? navigate('/clients') : navigate('/missing', { replace: true, state: {missing: "client"} })
    }

    // Navigation Blocker
    usePrompt('You have unsaved changes. Are you sure you want to leave?', updateRequired && !loading);

    // Fetch Clients Data
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);

        const fetchData = async () => {
            await axiosPrivate({
                method: 'post',
                signal: controller.signal,
                data: JSON.stringify({
                    query: `query ClientDetails($client: String!) {
                        clients(client: $client) {
                            id
                            name
                            displayName
                            abn
                        }
                        clientContacts(client: $client) {
                            id
                            firstName
                            lastName
                            position
                            phone
                            email
                            region {
                                id
                            }
                            active
                        }
                        locations(client: $client){
                            id
                            clientRef
                            name
                            address
                            locality
                            state
                            postcode
                            region {
                                id
                            }
                        }
                        regions(client: $client) {
                            id
                            shortName
                            name
                            email
                            billToAddress
                        }
                    }`,

                    variables: {
                        client: client
                    }
                }),
            }).then((response) => {
                const res = response?.data?.data;
                // Flatten region ojects
                const contacts = res?.clientContacts?.map((obj: any) => ({...obj, region: obj?.region?.id}))
                const locations = res?.locations?.map((obj: any) => ({...obj, region: obj?.region?.id}))
                setDetails(res?.clients[0]);
                setContacts(contacts);
                setLocations(locations);
                setRegions(res?.regions);
                setLoading(false);
                
                setApp((prev: any) => ({...prev, title: res?.clients[0].name}))
            });
        }
        fetchData();

        return () => {
            controller.abort();
        }
        
    }, [])

    const handleSave = async () => {
        setWaiting(true);
        
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
            query: `mutation Update(
                    $details: ClientInputType!, 
                    $locations: [LocationInputType]!, 
                    $contacts: [ClientContactInput]!, 
                    $regions: [RegionInput]!, 
                    $client: String!
                ) {
                    client: updateClient(details:$details) {
                        success
                        message
                    }
                    location: updateLocation(locations: $locations, client: $client) {
                        success
                        message
                    }
                    contact: updateContact(contacts: $contacts, client: $client) {
                        success
                    }
                    region: updateRegion(regions: $regions, client: $client) {
                        success
                        message
                    }
                }
            `,
            variables: { 
                details: details,
                locations: locations,
                contacts: contacts,
                regions: regions,
                client: client
            }, 
        }),
        }).then((response) => {
            const res = response?.data?.data;
            if(res.client?.success & res.location?.success & res.contact?.success & res.region?.success){
                setSnack({active: true, variant: 'success', message: "Changes Saved Successfully"});
                setUpdateRequired(false);
            }
            else {
                console.log("error",res)
                let errorMessage = ""
                for(const update in res) {
                    if(!res[update].success) {
                        errorMessage += res[update].message + "\n"
                    }
                }
                setSnack({active: true, variant: 'error', message:`Error saving changes:\n${errorMessage}`});
            }
        }).catch((err) => {
            console.log("Error", err)
            setSnack({active: true, variant: 'error', message: 'Server Error when saving changes'});
        }).finally(() => {
            setWaiting(false);
        })

    }

    
    const [tabValue, setTabValue] = useState(0); // Active Tab tabValue
    const tabOptions = ["Client", "Regions", "Locations", "Contacts"]
    const tabItems = [
        <Home client={client} details={details} setDetails={setDetails} setUpdateRequired={setUpdateRequired} setSnack={setSnack}/>, 
        
        <Regions regions={regions} setRegions={setRegions} client={client}
            setUpdateRequired={setUpdateRequired} setSnack={setSnack} 
            createDialog={createDialog} setCreateDialog={setCreateDialog}/>,

        <Locations locations={locations} setLocations={setLocations} regions={regions} client={client}
            setUpdateRequired={setUpdateRequired} setSnack={setSnack}
            createDialog={createDialog} setCreateDialog={setCreateDialog} />, 

        <Contacts contacts={contacts} setContacts={setContacts} regions={regions} client={client} 
            setUpdateRequired={setUpdateRequired} setSnack={setSnack}
            createDialog={createDialog} setCreateDialog={setCreateDialog} />
    ]

    return (
    <>
        <TabComponent tabValue={tabValue} setTabValue={setTabValue} tabItems={tabItems} tabOptions={tabOptions} />

        <SnackBar snack={snack} setSnack={setSnack} />

        <Footer>
            <Tooltip title="Save Changes">
                <ProgressIconButton waiting={waiting} disabled={!updateRequired} onClick={handleSave}>
                    <SaveIcon />
                </ProgressIconButton>
            </Tooltip>
            {tabValue > 0 ?
                <Tooltip title={`Create New ${tabOptions[tabValue].slice(0, -1)}`}>
                    <IconButton onClick={(e) => setCreateDialog(prev => ({...prev, [tabOptions[tabValue]]: true}))}><AddIcon /></IconButton>
                </Tooltip> : 
            <></> }
        </Footer>
    </>    

    )
}

export default Client;