import React from 'react'
import { ActionCable } from 'react-actioncable-provider'
import { getConversations, getAllConversations, subscribeUser } from '../adapter/api'

import NewConversationForm from './NewConversationForm'
import MessagesArea from './MessagesArea'
import Cable from './Cable'

import FormControl from '@material-ui/core/FormControl'
import Select from '@material-ui/core/Select'

import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'

import SimpleSnackbar from './SimpleSnackbar'

class ConversationsList extends React.Component {

  state = {
    conversations: [],
    allConversations: [],
    activeConversation: null,
    user_id: 1,
    snackbarMessage: "",
    showSnackbar: false,
  }

  componentDidMount() {
    this.setState({
      user_id: this.props.activeUser.id
    }, () => {
      getConversations(this.state.user_id).then(conversations => {
        console.log("CONV: ", conversations)
        this.setState({conversations: conversations})
    })
      getAllConversations()
        .then(allConversations => {
        this.setState({allConversations: allConversations})
      })
    })
  }

  handleClick = (id) => {
    console.log("Active ID: ", id);
    this.setState({
      activeConversation: id,
      showEmojis: false,
    })
  }

  handleOptionSelect = (e) => {
    console.log("SELECTED ID: ", e.target.value)
    if (e.target.value) {
      subscribeUser(parseInt(e.target.value), this.state.user_id)
      .then(res => {
        if(!res.error) {
          this.setState({
            conversations: [...this.state.conversations, res]
          })
        }else {
          console.log(res.error)
        }
      })
    }
  }

  handleReceivedConversation = (res) => {
    const { conversation } = res
    this.setState({
      conversations: [...this.state.conversations, conversation],
      allConversations: [...this.state.allConversations, conversation]
    })
  }

  handleReceivedMessage = (res) => {

    const { message } = res
    const conversations = [...this.state.conversations]
    console.log("in handleRec :", conversations)

    switch(res.type) {
      case "ADDING_USER":
        const new_message = {
          text: `${res.new_user.name} has joined the channel`,
          id: "ADMIN",
          user_name: "CHANNEL BOT",
          created_at: Date.now()
        }
        this.setState({
          snackbarMessage: `${res.new_user.name} has joined the channel ${res.conversation.title}`,
          showSnackbar : true
        })
        const active_conversation = conversations.find(
          conversation => {
            if(parseInt(conversation.id) === parseInt(res.conversation.id)) {
              return true
            }
          }
        )
        active_conversation.messages = [...active_conversation.messages, new_message]
        this.setState({ conversations })
      break

      default:
        const conversation = conversations.find(
          conversation => {
            if(parseInt(conversation.id) === parseInt(message.conversation_id)) {
              return true
            }
          }
        )
        console.log("110: ", conversation)
        conversation.messages = [...conversation.messages, message]
        this.setState({ conversations })
      break
    }
  }

  toggleSnackbar = () => {
    this.setState({
      showSnackbar: !this.state.showSnackbar
    })
  }

  render() {

    const { conversations, activeConversation } = this.state

    return (
      <div style={styles.container}>
        <ActionCable channel={{ channel: 'ConversationsChannel',
          conversation_id: this.state.activeConversation }}
          onReceived={this.handleReceivedConversation}
        />
        {
          this.state.conversations.length
          ?
            <Cable conversations={conversations}
              handleReceivedMessage={this.handleReceivedMessage}
            />
          : null
        }
        <div style={styles.chatListContainer}>
          <span style={styles.whosOnlineListContainer}>
            <p>Search for channels:</p>
            <FormControl style={{color:'white', minWidth: '120px'}}>
              <Select
                native
                style={{color:'white'}}
                onChange={this.handleOptionSelect}
              >
                {
                  this.state.allConversations.map(conversation => {
                    return (
                      <option key={Math.random()} value={conversation.id} id={conversation.id}>
                        {conversation.title}
                      </option>
                    )
                  })
                }
              </Select>
            </FormControl>

            <div style={styles.channelsSection}>
              <p>Channels:</p>
              <List>
                { mapConversations(conversations, this.handleClick) }
              </List>
            </div>

            <NewConversationForm userId={this.state.user_id}/>
          </span>
          {
            activeConversation ?
              <span style={styles.chatContainer}>
                <MessagesArea
                  user_id={this.state.user_id}
                  toggleEmojis={this.toggleEmojis} showEmojis={this.state.showEmojis}
                  conversation={findActiveConversation(conversations, activeConversation)}
                />
              </span>
            : null
          }
        </div>
        <SimpleSnackbar
          message={this.state.snackbarMessage}
          open={this.state.showSnackbar}
          toggleSnackbar={this.toggleSnackbar}
        />
      </div>
    )
  }
}

export default ConversationsList

const styles = {
  container: {
    height: '95vh',
    display: 'flex',
    flexDirection: 'column',
    paddingTop : '5em',
    //paddingBottom : '5em',
    zIndex:'-10',
    //border: '1px solid black'
  },
  chatContainer: {
    paddingLeft: '20px',
    flex: 'none',
    width: '70%',
    height: '95vh',
    display: 'inline',
    //border: '1px solid #000',
    overflowY: 'scroll',
    overflowX: 'scroll',
    //paddingBottom: '20px',
  },
  whosOnlineListContainer: {
    width: '25%',
    height: '95vh',
    flex: 'none',
    padding: '20px',
    backgroundColor: '#2c303b',
    color: 'white',
    display: 'inline',
    overflowY: 'scroll',
  },
  li: {
    display: 'flex',
    marginTop: 5,
    marginBottom: 5,
    paddingTop: '1em',
    paddingBottom: 2,
    cursor: 'pointer',
  },
  chatListContainer: {
    padding: 0,
    width: '100%',
    display: 'flex',
    //flexDirection: 'column',
    //border: '1px solid grey',
  },
  ul: {
    listStyle: 'none',
  },
  channelsSection: {
    margin: '50px 0',
    //border: '1px solid #fff',
  },
}

const findActiveConversation = (conversations, activeConversation) => {
  return conversations.find(
    conversation => conversation.id === activeConversation
  )
}

const mapConversations = (conversations, handleClick) => {
  return conversations.map(conversation => {
    return (
      <ListItem
        button
        key={Math.random().toString(36).substring(7)}
        onClick={() => handleClick(conversation.id)}
      >
        # {conversation.title}
      </ListItem>
    )
  })
}
