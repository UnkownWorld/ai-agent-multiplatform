import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ChatScreen from './src/screens/ChatScreen';
import ConversationListScreen from './src/screens/ConversationListScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator initialRouteName="Conversations">
          <Stack.Screen 
            name="Conversations" 
            component={ConversationListScreen}
            options={{ title: 'AI Agent' }}
          />
          <Stack.Screen 
            name="Chat" 
            component={ChatScreen}
            options={({ route }) => ({ title: route.params?.title || '对话' })}
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen}
            options={{ title: '设置' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
