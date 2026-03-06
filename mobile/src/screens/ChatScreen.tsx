import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// 消息类型
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

// 模拟Agent Hook（实际项目中从共享核心导入）
function useAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<'idle' | 'thinking'>('idle');

  const sendMessage = async (content: string) => {
    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    setStatus('thinking');

    // 模拟AI响应
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `收到您的消息：${content}\n\n我是AI Agent，正在为您处理...`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setStatus('idle');
    }, 1500);
  };

  return { messages, status, sendMessage };
}

// 消息气泡组件
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  
  return (
    <View style={[
      styles.messageContainer,
      isUser ? styles.userMessageContainer : styles.assistantMessageContainer
    ]}>
      <View style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.assistantBubble
      ]}>
        <Text style={[
          styles.messageText,
          isUser ? styles.userMessageText : styles.assistantMessageText
        ]}>
          {message.content}
        </Text>
      </View>
      <Text style={styles.timestamp}>
        {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );
}

// 聊天屏幕
export default function ChatScreen({ route }: any) {
  const { messages, status, sendMessage } = useAgent();
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const handleSend = () => {
    if (input.trim() && status === 'idle') {
      sendMessage(input.trim());
      setInput('');
    }
  };

  useEffect(() => {
    // 滚动到底部
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 消息列表 */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>开始对话吧</Text>
            </View>
          }
        />

        {/* 输入区域 */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="输入消息..."
            placeholderTextColor="#999"
            multiline
            editable={status === 'idle'}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!input.trim() || status !== 'idle') && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            disabled={!input.trim() || status !== 'idle'}
          >
            {status === 'thinking' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  assistantMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    marginHorizontal: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    fontSize: 15,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});
