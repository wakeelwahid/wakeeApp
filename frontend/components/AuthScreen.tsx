import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
  onClose: () => void;
  visible: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isSmallDevice = SCREEN_WIDTH < 375;

export default function AuthScreen({
  onAuthSuccess,
  onClose,
  visible,
}: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  // Reset form data when modal opens or closes
  React.useEffect(() => {
    if (visible) {
      setLoginData({
        phone: "",
        password: "",
      });
      setRegisterData({
        name: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
        referralCode: "",
      });
      setLoading(false);
      setIsLogin(true); // Default to login tab
    }
  }, [visible]);

  // Login form state
  const [loginData, setLoginData] = useState({
    phone: "",
    password: "",
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
  });

  const handleLogin = async () => {
    // Validation
    if (!loginData.phone || !loginData.password) {
      Alert.alert("❌ Error", "कृपया सभी fields भरें");
      return;
    }

    if (loginData.phone.length !== 10) {
      Alert.alert("❌ Error", "कृपया valid 10 digit mobile number डालें");
      return;
    }

    setLoading(true);
    try {
      const result = await login(loginData);

      if (result.success && result.user) {
        // Show success message
        Alert.alert(
          "✅ Login Successful!",
          `Welcome back, ${result.user.username || result.user.name}! 🎉`,
          [
            {
              text: "Continue",
              onPress: () => {
                // First close the modal
                onClose();
                // Then trigger auth success which should redirect to home
                setTimeout(() => {
                  onAuthSuccess(result.user);
                }, 100);
              }
            }
          ]
        );
      } else {
        // Handle specific error messages
        let errorMessage = result.error || "Login failed. Please try again.";
        
        if (errorMessage.includes("Invalid mobile number or password")) {
          errorMessage = "❌ Invalid credentials!\nMobile number या password गलत है।";
        } else if (errorMessage.includes("blocked")) {
          errorMessage = "❌ Account Blocked!\nआपका account admin द्वारा block कर दिया गया है।";
        }
        
        Alert.alert("❌ Login Failed", errorMessage);
      }
    } catch (error) {
      Alert.alert(
        "❌ Network Error",
        "Connection failed! कृपया अपना internet connection check करें।"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    // Validation
    if (
      !registerData.name ||
      !registerData.phone ||
      !registerData.password ||
      !registerData.confirmPassword
    ) {
      Alert.alert("❌ Error", "कृपया सभी आवश्यक fields भरें");
      return;
    }

    if (registerData.name.length < 2) {
      Alert.alert("❌ Error", "Name कम से कम 2 characters का होना चाहिए");
      return;
    }

    if (registerData.phone.length !== 10) {
      Alert.alert("❌ Error", "कृपया valid 10 digit mobile number डालें");
      return;
    }

    if (!/^\d+$/.test(registerData.phone)) {
      Alert.alert("❌ Error", "Mobile number में केवल numbers होने चाहिए");
      return;
    }

    if (registerData.email && !registerData.email.includes("@")) {
      Alert.alert("❌ Error", "कृपया valid email address डालें");
      return;
    }

    if (registerData.password.length < 6) {
      Alert.alert("❌ Error", "Password कम से कम 6 characters का होना चाहिए");
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      Alert.alert("❌ Password Mismatch", "Password और Confirm Password match नहीं कर रहे");
      return;
    }

    setLoading(true);
    try {
      const result = await register(registerData);

      if (result.success && result.user) {
        const userWithNewFlag = { ...result.user, isNewUser: true };
        
        // Show success message with referral info
        const successMessage = registerData.referralCode 
          ? `🎉 Registration Successful!\nWelcome ${registerData.name}!\n\n✅ Account created with referral code\n🎁 You'll get bonus on first deposit!`
          : `🎉 Registration Successful!\nWelcome ${registerData.name}!\n\n✅ Account created successfully\n🚀 Ready to start playing!`;

        Alert.alert(
          "✅ Welcome to Dream11 Pro!",
          successMessage,
          [
            {
              text: "Start Playing! 🎮",
              onPress: () => {
                // First close the modal
                onClose();
                // Then trigger auth success which should redirect to home
                setTimeout(() => {
                  onAuthSuccess(userWithNewFlag);
                }, 100);
              }
            }
          ]
        );
      } else {
        // Handle specific error messages
        let errorMessage = result.error || "Registration failed. Please try again.";
        
        if (errorMessage.includes("Username already exists")) {
          errorMessage = "❌ Username पहले से exists करता है!\nकोई और username try करें।";
        } else if (errorMessage.includes("Mobile number already exists")) {
          errorMessage = "❌ Mobile number पहले से registered है!\nLogin करें या different number use करें।";
        } else if (errorMessage.includes("Invalid referral code")) {
          errorMessage = "❌ Invalid Referral Code!\nReferral code गलत है या exist नहीं करता।";
        }
        
        Alert.alert("❌ Registration Failed", errorMessage);
      }
    } catch (error) {
      Alert.alert(
        "❌ Network Error", 
        "Registration failed! कृपया अपना internet connection check करें।"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>
                {isLogin ? "🔐 Login करें" : "📝 Register करें"}
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, isLogin && styles.activeTab]}
                  onPress={() => setIsLogin(true)}
                >
                  <Text
                    style={[styles.tabText, isLogin && styles.activeTabText]}
                  >
                    Login
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, !isLogin && styles.activeTab]}
                  onPress={() => setIsLogin(false)}
                >
                  <Text
                    style={[styles.tabText, !isLogin && styles.activeTabText]}
                  >
                    Register
                  </Text>
                </TouchableOpacity>
              </View>

              {isLogin ? (
                <View style={styles.formContainer}>
                  <Text style={styles.formTitle}>
                    अपने Account में Login करें
                  </Text>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>📱 Mobile Number</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="10 digit mobile number"
                      placeholderTextColor="#666"
                      value={loginData.phone}
                      onChangeText={(text) =>
                        setLoginData({ ...loginData, phone: text })
                      }
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>🔒 Password</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter your password"
                      placeholderTextColor="#666"
                      value={loginData.password}
                      onChangeText={(text) =>
                        setLoginData({ ...loginData, password: text })
                      }
                      secureTextEntry
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.authButton,
                      loading && styles.authButtonDisabled,
                    ]}
                    onPress={handleLogin}
                    disabled={loading}
                  >
                    <Text style={styles.authButtonText}>
                      {loading ? "Login हो रहा है..." : "🚀 Login करें"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.forgotPassword}>
                    <Text style={styles.forgotPasswordText}>
                      Password भूल गए?
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.formContainer}>
                  <Text style={styles.formTitle}>नया Account बनाएं</Text>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>👤 Full Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter your full name"
                      placeholderTextColor="#666"
                      value={registerData.name}
                      onChangeText={(text) =>
                        setRegisterData({ ...registerData, name: text })
                      }
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>📱 Mobile Number *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="10 digit mobile number"
                      placeholderTextColor="#666"
                      value={registerData.phone}
                      onChangeText={(text) =>
                        setRegisterData({ ...registerData, phone: text })
                      }
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>📧 Email (Optional)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter your email"
                      placeholderTextColor="#666"
                      value={registerData.email}
                      onChangeText={(text) =>
                        setRegisterData({ ...registerData, email: text })
                      }
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>🔒 Password *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Minimum 6 characters"
                      placeholderTextColor="#666"
                      value={registerData.password}
                      onChangeText={(text) =>
                        setRegisterData({ ...registerData, password: text })
                      }
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>🔒 Confirm Password *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Re-enter your password"
                      placeholderTextColor="#666"
                      value={registerData.confirmPassword}
                      onChangeText={(text) =>
                        setRegisterData({
                          ...registerData,
                          confirmPassword: text,
                        })
                      }
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>
                      🎁 Referral Code (Optional)
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter referral code"
                      placeholderTextColor="#666"
                      value={registerData.referralCode}
                      onChangeText={(text) =>
                        setRegisterData({
                          ...registerData,
                          referralCode: text.toUpperCase(),
                        })
                      }
                      autoCapitalize="characters"
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.authButton,
                      loading && styles.authButtonDisabled,
                    ]}
                    onPress={handleRegister}
                    disabled={loading}
                  >
                    <Text style={styles.authButtonText}>
                      {loading ? "Account बन रहा है..." : "✨ Account बनाएं"}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.termsContainer}>
                    <Text style={styles.termsText}>
                      By registering, you agree to our Terms & Conditions
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  keyboardAvoidingView: {
    width: "100%",
    maxWidth: isSmallDevice ? 340 : 380,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  modalContainer: {
    backgroundColor: "rgba(10, 10, 10, 0.95)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#00FF88",
    overflow: "hidden",
    shadowColor: "#00FF88",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    // backdropFilter: 'blur(10px)',
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "rgba(26, 26, 26, 0.9)",
    borderBottomWidth: 1,
    borderBottomColor: "#00FF88",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#00FF88",
    flex: 1,
  },
  closeButton: {
    padding: 10,
    borderRadius: 25,
    backgroundColor: "rgba(255, 107, 107, 0.2)",
    borderWidth: 1,
    borderColor: "#FF6B6B",
  },
  scrollContainer: {
    flex: 1,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  scrollContent: {
    paddingBottom: 30,
    flexGrow: 1,
  },
  tabContainer: {
    flexDirection: "row",
    margin: 12,
    backgroundColor: "rgba(26, 26, 26, 0.8)",
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: "#00FF88",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: "#00FF88",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999999",
  },
  activeTabText: {
    color: "#000000",
    fontWeight: "700",
  },
  formContainer: {
    padding: 12,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#00FF88",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "rgba(26, 26, 26, 0.8)",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#ffffff",
    minHeight: 40,
  },
  authButton: {
    backgroundColor: "#00FF88",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#00FF88",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
  },
  forgotPassword: {
    alignItems: "center",
    marginTop: 10,
  },
  forgotPasswordText: {
    color: "#4A90E2",
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  termsContainer: {
    marginTop: 10,
    alignItems: "center",
    paddingHorizontal: 10,
  },
  termsText: {
    color: "#999999",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#333333",
  },
  dividerText: {
    color: "#666666",
    fontSize: 12,
    paddingHorizontal: 15,
    fontWeight: "600",
  },
  testLoginButton: {
    backgroundColor: "rgba(74, 144, 226, 0.1)",
    borderWidth: 1,
    borderColor: "#4A90E2",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 5,
  },
});
