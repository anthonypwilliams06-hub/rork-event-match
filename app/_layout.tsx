import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="events" options={{ headerShown: false }} />
      <Stack.Screen
        name="event-detail"
        options={{
          title: "Event Details",
          headerStyle: { backgroundColor: "#FF6B6B" },
          headerTintColor: "#fff",
        }}
      />
      <Stack.Screen
        name="profile-detail"
        options={{
          title: "Profile",
          headerStyle: { backgroundColor: "#FF6B6B" },
          headerTintColor: "#fff",
        }}
      />
      <Stack.Screen
        name="create-event"
        options={{
          presentation: "modal",
          title: "Create Event",
          headerStyle: { backgroundColor: "#FF6B6B" },
          headerTintColor: "#fff",
        }}
      />
      <Stack.Screen name="create-account" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
      <Stack.Screen name="create-profile" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard-creator" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard-seeker" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="user-profile/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="messages" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[userId]" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            <AppProvider>
              <GestureHandlerRootView>
                <RootLayoutNav />
              </GestureHandlerRootView>
            </AppProvider>
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
