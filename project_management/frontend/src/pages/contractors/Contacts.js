import React, { useState, useEffect }  from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';

const Contacts = () => {

    const axiosPrivate = useAxiosPrivate();
    const [contractors, setContractors] = useState([]);
    const [newContractor, setNewContractor] = useState({
        'name': '',
        'abn': '',
        'bsb': '',
        'bankAccountName': '',
        'bankAccountNumber': '',
    });

    useEffect(() => {
        // Get Data
        axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `{ 
                    contractors {
                        id
                        myobUid
                        name
                        abn
                        bsb
                        bankAccountName
                        bankAccountNumber
                    }
                }`,
                variables: {}
            }),
        }).then((response) => {
            const res = response?.data?.data;
            // console.log("res", res);
            setContractors(res?.contractors);
        });
    }, []);


    return(
        <pre>
            <code>{JSON.stringify(contractors, null, 2)}</code>
        </pre>
    );
}

export default Contacts;