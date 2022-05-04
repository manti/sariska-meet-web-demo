import { Box, makeStyles } from '@material-ui/core';
import React, { useEffect, useState } from 'react'
import { color } from '../../assets/styles/_color';
import ActionButtons from '../../components/meeting/ActionButtons';
import SariskaMediaTransport from 'sariska-media-transport';
import Navbar from '../../components/shared/Navbar'
import ReconnectDialog from "../../components/shared/ReconnectDialog";
import { useDispatch, useSelector } from "react-redux";
import { addRemoteTrack, participantLeft, removeRemoteTrack, remoteTrackMutedChanged } from "../../store/actions/track";
import GridLayout from "../../components/meeting/GridLayout";
import SpeakerLayout from "../../components/meeting/SpeakerLayout";
import PresentationLayout from "../../components/meeting/PresentationLayout";
import Notification from "../../components/shared/Notification";
import { SPEAKER, PRESENTATION, GRID, ENTER_FULL_SCREEN_MODE} from "../../constants";
import { addMessage } from "../../store/actions/message";
import { getUserById, preloadIframes } from "../../utils";
import PermissionDialog from "../../components/shared/PermissionDialog";
import SnackbarBox from '../../components/shared/Snackbar';
import { unreadMessage } from '../../store/actions/chat';
import Home from "../Home";
import { setPresenter, setPinParticipant, setRaiseHand, setModerator, setDisconnected } from "../../store/actions/layout";
import { setAudioLevel } from "../../store/actions/audioIndicator";
import { showNotification } from "../../store/actions/notification";
import { addSubtitle } from '../../store/actions/subtitle';
import { useHistory } from 'react-router-dom';
import { setUserResolution } from '../../store/actions/layout';
import {useOnlineStatus} from "../../hooks/useOnlineStatus";
import { updateLocalTrack } from '../../store/actions/track';
import {useWindowResize} from "../../hooks/useWindowResize";
import {useDocumentSize} from "../../hooks/useDocumentSize";
import ReactGA from 'react-ga4';

const Meeting = () => {
    const history = useHistory();
    const dispatch = useDispatch();
    const localTracks = useSelector(state => state.localTrack);
    const conference = useSelector(state => state.conference);
    const connection = useSelector(state => state.connection);
    const layout = useSelector(state => state.layout);
    const notification = useSelector(state => state.notification);
    const snackbar = useSelector(state => state.snackbar);
    const isOnline = useOnlineStatus()
    const resolution = useSelector(state=>state.media?.resolution);
    const [dominantSpeakerId, setDominantSpeakerId] = useState(null);
    const [lobbyUserJoined, setLobbyUserJoined] = useState({});
    const {documentHeight, documentWidth} = useDocumentSize();
    const {viewportWidth, viewportHeight} = useWindowResize();

    const useStyles = makeStyles((theme) => ({
        root: {
            display: "flex",
            flexDirection: "column",
            background: color.secondaryDark,
            minHeight: layout.mode === ENTER_FULL_SCREEN_MODE ? "100vh":  "calc(100vh - 16px)",
            "& .gridSeparator": {
                boxSizing: "border-box",
                border: "2px solid black",
                borderRadius: "8px"
            },
            "& .activeSpeaker": {
                boxSizing: "border-box",
                border: "3px solid #44A5FF",
                borderRadius: "8px"
            }
        }
    }));

    const classes = useStyles();
    let ingoreFirstEvent = true;

    const allowLobbyAccess = () => {
        conference.lobbyApproveAccess(lobbyUserJoined.id)
        setLobbyUserJoined({});
    }

    const denyLobbyAccess = () => {
        conference.lobbyDenyAccess(lobbyUserJoined.id);
        setLobbyUserJoined({});
    }

    const deviceListChanged = async (devices) => {
        // const [audioTrack, videoTrack] = localTracks;
        // const options = {
        //     devices: ["audio", "video"],
        //     resolution
        // };
        // const [newAudioTrack, newVideoTrack] = await SariskaMediaTransport.createLocalTracks(options);
        // await conference.replaceTrack(audioTrack, newAudioTrack);
        // await conference.replaceTrack(videoTrack, newVideoTrack);
        // dispatch(updateLocalTrack(audioTrack, newAudioTrack));
        // dispatch(updateLocalTrack(videoTrack, newVideoTrack));
    }
    
    const audioOutputDeviceChanged = (deviceId)=> {
        //  console.log("audio output deviceId", deviceId);
        //  SariskaMediaTransport.mediaDevices.setAudioOutputDevice(deviceId);
    }

    const destroy = async () => {
        if (conference?.isJoined()) {
            await conference?.leave();
        }
        for (const track of localTracks) {
            await track.dispose();
        }
        await connection?.disconnect();
        SariskaMediaTransport.mediaDevices.removeEventListener(SariskaMediaTransport.mediaDevices.DEVICE_LIST_CHANGED, deviceListChanged);
    }

    useEffect(() => {
        if (!conference) {
            return;
        }

        conference.getParticipantsWithoutHidden().forEach(item=>{
            if (item._properties?.presenting === "start") {
                dispatch(showNotification({autoHide: true, message: `Screen sharing is being presenting by ${item._identity?.user?.name}`}));
                dispatch(setPresenter({participantId: item._id, presenter: true}));
            }

            if (item._properties?.handraise === "start") {
                dispatch(setRaiseHand({ participantId: item._id, raiseHand: true }));
            }
            
            if (item._properties?.isModerator === "true") {
                dispatch(setModerator({ participantId: item._id, isModerator: true }));
            }
            
            if (item._properties?.resolution) {
                dispatch(setUserResolution({ participantId: item._id, resolution: item._properties?.resolution }));
            }
        });
        
        conference.addEventListener(SariskaMediaTransport.events.conference.TRACK_REMOVED, (track) => {
            dispatch(removeRemoteTrack(track));
        });

        conference.addEventListener(SariskaMediaTransport.events.conference.TRACK_ADDED, (track) => {
            if (track.isLocal()) {
                return;
            }
            dispatch(addRemoteTrack(track));
        });

        conference.addEventListener(SariskaMediaTransport.events.conference.FACIAL_EXPRESSION_ADDED, (expression) => {
            console.log("FACIAL_EXPRESSION_ADDED", expression);
        });

        conference.addEventListener(SariskaMediaTransport.events.conference.SUBTITLES_RECEIVED, (id, name, text) => {
            dispatch(addSubtitle({ name, text }));
        });

        conference.addEventListener(SariskaMediaTransport.events.conference.TRACK_MUTE_CHANGED, (track) => {
            dispatch(remoteTrackMutedChanged());
        });

        conference.addEventListener(SariskaMediaTransport.events.conference.DOMINANT_SPEAKER_CHANGED, (id) => {
            setDominantSpeakerId(id);
        });
        conference.addEventListener(SariskaMediaTransport.events.conference.PARTICIPANT_PROPERTY_CHANGED, (participant, key, oldValue, newValue) => {
            console.log("participant, key, oldValue, newValue 1", participant, key, oldValue, newValue)
            if (key === "presenting" && newValue === "start") {
                dispatch(showNotification({ autoHide: true, message: `Screen sharing started by ${participant._identity?.user?.name}` }));
                dispatch(setPresenter({ participantId: participant._id, presenter: true }));
            }

            if (key === "presenting" && newValue === "stop") {
                dispatch(setPresenter({ participantId: participant._id, presenter: false }));
            }

            if (key === "handraise" && newValue === "start") {
                dispatch(setRaiseHand({ participantId: participant._id, raiseHand: true }));
            }

            if (key === "handraise" && newValue === "stop") {
                dispatch(setRaiseHand({ participantId: participant._id, raiseHand: false }));
            }

            if (key === "isModerator" && newValue === "true") {
                dispatch(setModerator({ participantId: participant._id, isModerator: true }));
            }
            
            if (key === "resolution") {
                dispatch(setUserResolution({ participantId: participant._id, resolution: newValue }));
            }
        });

        conference.addEventListener(SariskaMediaTransport.events.conference.USER_LEFT, (id) => {
            if (id === dominantSpeakerId) {
                setDominantSpeakerId(null);
            }

            if (id === layout.pinnedParticipantId) {
                dispatch(setPinParticipant(null))
            }

            if (layout.presenterParticipantIds.find(item => item === id)) {
                dispatch(setPresenter({ participantId: id, presenter: null }));
            }

            if (layout.raisedHandParticipantIds[id]) {
                dispatch(setRaiseHand({ participantId: id, raiseHand: null }));
            }
                
            dispatch(participantLeft(id));
        });

        conference.addEventListener(SariskaMediaTransport.events.conference.LOBBY_USER_JOINED, (id, displayName) => {
            new Audio("https://sdk.sariska.io/knock_0b1ea0a45173ae6c10b084bbca23bae2.ogg").play();
            setLobbyUserJoined({ id, displayName });
        });

        conference.addEventListener(SariskaMediaTransport.events.conference.MESSAGE_RECEIVED, (id, text, ts) => {
            dispatch(addMessage({ text: text, user: getUserById(id, conference), time: new Date() }));
            if (id !== conference.myUserId()) {
                dispatch(unreadMessage(1))
            }
        });

        conference.addEventListener(SariskaMediaTransport.events.conference.NOISY_MIC, () => {
            dispatch(showNotification({ autoHide: true, message: "Your mic seems to be noisy", severity: "info" }));
        });

        conference.addEventListener(SariskaMediaTransport.events.conference.TALK_WHILE_MUTED, () => {
            dispatch(showNotification({ autoHide: true, message: "Trying to speak?  your are muted!!!", severity: "info" }));
        });

        conference.addEventListener(SariskaMediaTransport.events.conference.NO_AUDIO_INPUT, () => {
            dispatch(showNotification({ autoHide: true, message: "Looks like device has no audio input", severity: "warning" }));
        });

        conference.addEventListener(SariskaMediaTransport.events.conference.TRACK_AUDIO_LEVEL_CHANGED, (participantId, audioLevel) => {
            dispatch(setAudioLevel({ participantId, audioLevel }));
        });
        
        conference.addEventListener(SariskaMediaTransport.events.conference.CONNECTION_INTERRUPTED, () => {
            dispatch(showNotification({
                message: "You lost your internet connection. Trying to reconnect...",
                severity: "info"
            }));
            ingoreFirstEvent = false;
        });

        conference.addEventListener(SariskaMediaTransport.events.conference.ENDPOINT_MESSAGE_RECEIVED, async ( participant, data) => {
            if (data.event === "LOBBY-ACCESS-GRANTED" || data.event === "LOBBY-ACCESS-DENIED") {
                setLobbyUserJoined({});
            }
        });

        
        conference.addEventListener(SariskaMediaTransport.events.conference.CONNECTION_RESTORED, () => {
            if (ingoreFirstEvent) {
                return;
            }
            dispatch(showNotification({
                message: "Your Internet connection was restored",
                autoHide: true,
                severity: "info"
            }));
        });

        conference.addEventListener(SariskaMediaTransport.events.conference.ANALYTICS_EVENT_RECEIVED, (payload) => {
            const { name, action, actionSubject, source, attributes } = payload;
            ReactGA.event({		            
                category: name,		
                action,		
                label: actionSubject		
            })
        });

        conference.addEventListener(SariskaMediaTransport.events.conference.KICKED, (id)=> { // if a user kicked by moderator 
            // kicked participant id
          });

        conference.addEventListener(SariskaMediaTransport.events.conference.PARTICIPANT_KICKED, (actorParticipant, kickedParticipant, reason) => {

        })

        preloadIframes(conference);
        SariskaMediaTransport.effects.createRnnoiseProcessor();
        SariskaMediaTransport.mediaDevices.addEventListener(SariskaMediaTransport.events.mediaDevices.DEVICE_LIST_CHANGED, deviceListChanged);
        SariskaMediaTransport.mediaDevices.addEventListener(SariskaMediaTransport.events.mediaDevices.AUDIO_OUTPUT_DEVICE_CHANGED, audioOutputDeviceChanged);

        window.addEventListener("beforeunload", destroy);

        return () => {
            destroy();
        };
    }, [conference]);

    useEffect(()=>{
        SariskaMediaTransport.setNetworkInfo({ isOnline });
    }, [isOnline]);

    if (!conference || !conference.isJoined()) {
        return <Home />;
    }
    
    let justifyContent = "space-between";
    if (layout.mode === ENTER_FULL_SCREEN_MODE) {
        justifyContent = "space-around";
    }
    if (layout.type === GRID && conference.getParticipantCount() === 2) {
        justifyContent = "center";
    }
    let paddingTop = 16;
    if (viewportWidth  < 1025 && layout.type === GRID) {
        justifyContent = "center";
        paddingTop = 0;
    }
    if (layout.mode === ENTER_FULL_SCREEN_MODE) {
        paddingTop = 0 ;
    }

    return (
        <Box style={{ justifyContent, paddingTop:  paddingTop}} className={classes.root}>
            {layout.type === SPEAKER &&
                <SpeakerLayout dominantSpeakerId={dominantSpeakerId} />
            }
            {layout.type === GRID &&
                <GridLayout dominantSpeakerId={dominantSpeakerId} />
            }
            {layout.type === PRESENTATION &&
                <PresentationLayout dominantSpeakerId={dominantSpeakerId} />
            }
            <ActionButtons dominantSpeakerId={dominantSpeakerId} />
            {lobbyUserJoined.id && <PermissionDialog
                denyLobbyAccess={denyLobbyAccess}
                allowLobbyAccess={allowLobbyAccess}
                displayName={lobbyUserJoined.displayName} />}

            <SnackbarBox notification={notification} />
            <ReconnectDialog open={layout.disconnected === "lost"} />
            <Notification snackbar={snackbar} />
        </Box>
    )
}

export default Meeting
