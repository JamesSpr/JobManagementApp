import { useState } from 'react';
import useAxiosPrivate from '../../../hooks/useAxiosPrivate';
import { InputField, ProgressButton } from '../../../components/Components';
import { JobType, SnackType } from '../../../types/types';
import { jobQueryData } from '../Queries';

const EstimateSettings = ({estimate, setJob, setSnack}: {
    estimate: string
    setJob: React.Dispatch<React.SetStateAction<JobType>>
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
}) => {

    const axiosPrivate = useAxiosPrivate();
    const [waiting, setWaiting] = useState({check: false, transfer:false})
    const [valid, setValid] = useState({exists: false, name: '', job: {id: ''}})
    const [transferEstimate, setTransferEstimate] = useState('')

    const handleTransferEstimate = async () => {
        setWaiting(prev => ({...prev, transfer: true}));
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
            query: `
            mutation transferEstimate($estimateId:String!, $toJob:String!) {
                transfer: transferEstimate(estimateId:$estimateId, toJob:$toJob) {
                    success
                    message
                    job {
                        ${jobQueryData}
                    }
                }
            }`,
            variables: { 
                estimateId: estimate,
                toJob: valid.job.id
            },
        }),
        }).then((response) => {
            const res = response?.data?.data.transfer;
            setWaiting(prev => ({...prev, transfer: false}));
            
            if(res.success) {
                setSnack({active: true, variant: 'success', message: "Successfully transferred estimate"})
                setJob(res.job)
            } else {
                setSnack({active: true, variant: 'error', message:"Could not transfer estimate"})
                console.log(res);
            }
        }).catch((err) => {
            console.log("error:", err);
        });
    }

    const validateTransfer = async () => {
        setWaiting(prev => ({...prev, check: true}));

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
            query: `
            mutation checkJobExists($job:String!) {
                check: checkJobExists(job:$job) {
                    exists
                    name
                    job {
                        id
                    }
                }
            }`,
            variables: { 
                job: transferEstimate,
            },
        }),
        }).then((response) => {
            const res = response?.data?.data.check;
            setWaiting(prev => ({...prev, check: false}));

            if(res.exists) {
                setValid(res);
            }
            else {
                setSnack({active: true, variant: 'error', message:"Job does not exist with that identifier"})
                console.log(res);
            }
        }).catch((err) => {
            console.log("error:", err);
        });
    }

    return (
        <>
            <h4>Transfer Estimate to Another Job</h4>
            <InputField type='text' label="Job"
                onChange={e => {setTransferEstimate(e.target.value); setValid({exists: false, name: '', job: {id: ''}})}}/>
            <ProgressButton name='Check' disabled={valid.exists} waiting={waiting.check} onClick={validateTransfer} />
            {valid.exists ? <p>{valid.name}</p> : <p>Please enter valid job identifier</p>}
            <ProgressButton name='Transfer' disabled={!valid.exists} waiting={waiting.transfer} onClick={handleTransferEstimate} />
        </>
    );

}

export default EstimateSettings;