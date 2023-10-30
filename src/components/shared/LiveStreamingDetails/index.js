import {
  Avatar,
  Box,
  Button,
  Divider,
  makeStyles,
  Tooltip,
  Typography,
} from "@material-ui/core";
import React, { useEffect, useState } from "react";
import { color } from "../../../assets/styles/_color";
import MicNoneOutlinedIcon from "@material-ui/icons/MicNoneOutlined";
import MicOffOutlinedIcon from "@material-ui/icons/MicOffOutlined";
import MoreVertOutlinedIcon from '@material-ui/icons/MoreVertOutlined';
import { useDispatch, useSelector } from "react-redux";
import SearchBox from "../SearchBox";
import classnames from "classnames";
import CopyMeetingLink from "../CopyMeetingLink";
import {MenuBox} from "../MenuBox";
import {setPinParticipant} from "../../../store/actions/layout";
import { getParticipants } from "../../../utils";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    height: "95%",
    [theme.breakpoints.down('md')]: {
      height: '82%'
    }
  },
  underRoot: {
    [theme.breakpoints.down('md')]: {
      height: '100%'
    }
  },
  title: {
    color: color.secondary,
    fontSize: "0.85rem",
  },
  localBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(2, 0),
    color: color.white,
  },
  userBoxContainer: {
    display: "flex",
    flexDirection: "column",
    "& span": {
      marginLeft: "10px",
    },
  },
  userBox: {
    display: "flex",
    alignItems: "center",
    "&>div.MuiAvatar-root": {
      width: "30px",
      height: "30px",
      fontSize: "1rem",
    },
    "& p": {
      fontSize: "0.9rem",
    },
  },
  hostDetails: {
    display: "flex",
    flexDirection: "row",
  },
  hostBox: {
    display: "inline-flex",
    width: "auto !important",
    marginLeft: "10px",
    height: "23px !important",
  },
  iconBox: {
    display: "flex",
    alignItems: "center",
    "&>svg": {
      color: color.white,
      fontSize: "1.35rem",
    },
  },
  more: {
    marginLeft: theme.spacing(1),
    "&:hover": {
      color: color.primaryLight,
      cursor: "pointer",
    },
  },
  divider: {
    backgroundColor: color.search,
    marginTop: "auto",
    marginBottom: theme.spacing(2),
  },
  meetingDetailsContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    color: color.white,
  },
  meetingDetails: {
    marginLeft: theme.spacing(1),
    color: color.white,
    "& p": {
      color: color.primaryLight,
    },
    "& span": {
      fontWeight: 300,
    },
  },
  pin: {
    color: color.primary
  },
  iconContainer: {
    padding: "8px 12px 4px 12px",
    border: `1px solid transparent`,
    background: color.secondary,
    borderRadius: "48px",
    "&:hover": {
      opacity: "0.8",
      cursor: "pointer",
      border: `1px solid ${color.primaryLight}`,
      background: color.secondaryDark,
    },
  },
}));

const LiveStreamingDetails = () => {
  const classes = useStyles();
  const conference = useSelector((state) => state.conference);
  const avatarColors = useSelector((state) => state.color);
  const remoteTracks = useSelector((state) => state.remoteTrack);
  const localTracks = useSelector((state) => state.localTrack);
  const profile = useSelector((state) => state.profile);
  const layout = useSelector((state) => state.layout);
  const localUser = conference.getLocalUser();
  const [participantName, setParticipantName] = useState("");
  const [selectedOption, setSelectedOption] = useState({});

  const handleMenuOpen = (event, item) => {
    setSelectedOption({ ...selectedOption, [item]: event.currentTarget });
  };

  const handleMenuClose = (item) => {
    setSelectedOption({ ...selectedOption, [item]: null });
  };

  const handleOptionClick = (option, item) => {
    handleMenuClose(item);
  };

  const [participants, setParticipants] = useState(getParticipants(conference, localUser));

  
  const dispatch = useDispatch();

  const handleParticipantNameChange = (e) => {
    setParticipantName(e.target.value);
  };
  
  useEffect(() => {
    setParticipants(getParticipants(conference, localUser));
  }, [conference.getParticipantsWithoutHidden()?.length]);

  const filteredParticipants = !participantName
    ? participants
    : participants.filter((participant) => 
              participant?._identity?.user?.name
              ?.toLowerCase()
              .includes(participantName.toLowerCase())
  );

const togglePinParticipant = (id) => {
  dispatch(setPinParticipant(id));
}

const getAvatarColor =  (id)=> {
    return conference.participants[id]?._identity?.user?.avatar || profile?.color;
}

  return (
    <Box className={classes.root}>
      <Box>
        <Button>Custom RTMP</Button>
        <Button>Custom RTMP</Button>
      </Box>
      <Box className={classes.underRoot}>
        <SearchBox
          placeholder={"Search Participants"}
          value={participantName}
          id="participantName"
          name="participantName"
          handleChange={handleParticipantNameChange}
        />
      </Box>
    </Box>
  );
};

export default LiveStreamingDetails;

