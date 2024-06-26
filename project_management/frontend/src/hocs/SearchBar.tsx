import SearchIcon from '@mui/icons-material/Search';
import { Button } from "@mui/material";
import React, { ForwardedRef, Ref, forwardRef, useEffect, useRef, useState } from "react";
import { JobType } from '../types/types';
import useAxiosPrivate from '../hooks/useAxiosPrivate';
import { openInNewTab } from '../components/Functions';
import { useNavigate } from 'react-router-dom';

const SearchBar = () => {
    
    const axiosPrivate = useAxiosPrivate();
    const modalRef = useRef<HTMLDialogElement | null>(null);
    const [waiting, setWaiting] = useState(false);
    const [searchValue, setSearchValue] = useState('')
    const [searchResults, setSearchResults] = useState([]);

    const openSearch = () => {
        modalRef.current?.showModal();
    }
    
    // When the user clicks anywhere outside of the modal, close it
    window.addEventListener("click", (event) => {
        event.
        if (event.target == modalRef.current) {
            modalRef.current?.close()
        }
    })

    useEffect(() => {
        const controller = new AbortController();

        const getSearch = async () => {
            
            setWaiting(true);
            await axiosPrivate({
                method: 'post',
                signal: controller.signal,
                data: JSON.stringify({
                    query: `mutation searchJobs($query:String!) {
                        search: searchJobs(query: $query) {
                            success
                            message
                            results {
                                id
                                jobName
                            }
                        }
                    }`,
                    variables: {
                        query: searchValue,
                    }
                }),
            }).then((response) => {
                const res = response?.data?.data?.search;
                if(res.success) {                    
                    setSearchResults(res.results)
                }

            }).catch((err) => {
                console.log("error:", err);
            }).finally(() => {
                setWaiting(false);
            })
        }
        if(searchValue.length > 0) {
            getSearch()
        } else {
            setSearchResults([])
        }

        return () => {
            controller.abort();
        }

    }, [searchValue])

    const openJob = (job: string) => {
        openInNewTab('/job/edit/' + job);
        modalRef.current?.close();
    }

    return (
        <>
        <Button 
        
        variant="outlined" 
            style={{color: 'rgb(60, 60, 60)', width: '130px', marginTop: '8px',  marginRight: '16px', padding: '2px'}} 
            startIcon={<SearchIcon /> } 
            onClick={openSearch}>Search</Button>
        

        <dialog ref={modalRef} className="search-modal">
            <SearchInput initialValue={searchValue} setVal={setSearchValue} />
            <SearchResults results={searchResults} openJob={openJob}/>
        </dialog>
        </>
    )
}

// A debounced input react component
const SearchInput = ({initialValue, setVal}: {
    initialValue: string
    setVal: React.Dispatch<React.SetStateAction<string>>
}) => {
    const [value, setValue] = useState(initialValue);
  
    useEffect(() => {
      setValue(initialValue)
    }, [initialValue]);
  
    useEffect(() => {
      const timeout = setTimeout(() => {
        setVal(value.trim());
      }, 500);
  
      return () => clearTimeout(timeout)
    }, [value]);
  
    return (
        <input className="search-bar" type="text" name="Search" placeholder="Start Typing..." value={value} onChange={e => setValue(e.target.value)} />
    );
}

const SearchResults = ({results, openJob}: {
    results: JobType[]
    openJob: (job: string) => void
}) => {

    return (<div className="search-results-container">
        {
            results.length > 0 ?
            results.map(result => (
                <div className='search-result' onDoubleClick={() => openJob(result.id)}>{result?.jobName}</div>
            ))
            :
            <div className='search-result'>No results found for the search</div>
        }
    </div>)
}


export default SearchBar;