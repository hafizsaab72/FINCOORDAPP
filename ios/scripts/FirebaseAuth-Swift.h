// FirebaseAuth-Swift.h
// Stub ObjC bridge for Firebase Auth Swift classes (Firebase SDK 12.x)
// Recreated by post_install hook in Podfile — do not edit manually.
// Firebase 12.x moved FIRAuth and related types to Swift; this file provides
// the ObjC-compatible declarations that Xcode would normally generate.

#import <Foundation/Foundation.h>
#import <FirebaseCore/FirebaseCore.h>

#ifdef __OBJC__

@class FIRApp;
@class FIRAuth;
@class FIRUser;
@class FIRAuthCredential;
@class FIROAuthCredential;
@class FIRAuthDataResult;
@class FIRAdditionalUserInfo;
@class FIRAuthSettings;
@class FIRAuthTokenResult;
@class FIRUserMetadata;
@class FIRUserProfileChangeRequest;
@class FIRMultiFactorInfo;
@class FIRMultiFactorSession;
@class FIRMultiFactorResolver;
@class FIRMultiFactorAssertion;
@class FIRMultiFactor;
@class FIRPhoneMultiFactorInfo;
@class FIRPhoneMultiFactorAssertion;
@class FIRTOTPMultiFactorAssertion;
@class FIRTOTPSecret;
@class FIRPhoneAuthCredential;
@class FIRPhoneAuthProvider;
@class FIROAuthProvider;

// ---------------------------------------------------------------------------
// MARK: - FIRAuthErrorCode
// ---------------------------------------------------------------------------

typedef NS_ENUM(NSInteger, FIRAuthErrorCode) {
  FIRAuthErrorCodeInvalidCustomToken = 17000,
  FIRAuthErrorCodeCustomTokenMismatch = 17002,
  FIRAuthErrorCodeInvalidCredential = 17004,
  FIRAuthErrorCodeUserDisabled = 17005,
  FIRAuthErrorCodeOperationNotAllowed = 17006,
  FIRAuthErrorCodeEmailAlreadyInUse = 17007,
  FIRAuthErrorCodeInvalidEmail = 17008,
  FIRAuthErrorCodeWrongPassword = 17009,
  FIRAuthErrorCodeTooManyRequests = 17010,
  FIRAuthErrorCodeUserNotFound = 17011,
  FIRAuthErrorCodeAccountExistsWithDifferentCredential = 17012,
  FIRAuthErrorCodeRequiresRecentLogin = 17014,
  FIRAuthErrorCodeProviderAlreadyLinked = 17015,
  FIRAuthErrorCodeNoSuchProvider = 17016,
  FIRAuthErrorCodeInvalidUserToken = 17017,
  FIRAuthErrorCodeNetworkError = 17020,
  FIRAuthErrorCodeUserTokenExpired = 17021,
  FIRAuthErrorCodeInvalidAPIKey = 17023,
  FIRAuthErrorCodeUserMismatch = 17024,
  FIRAuthErrorCodeCredentialAlreadyInUse = 17025,
  FIRAuthErrorCodeWeakPassword = 17026,
  FIRAuthErrorCodeAppNotAuthorized = 17028,
  FIRAuthErrorCodeExpiredActionCode = 17029,
  FIRAuthErrorCodeInvalidActionCode = 17030,
  FIRAuthErrorCodeInvalidMessagePayload = 17031,
  FIRAuthErrorCodeInvalidSender = 17032,
  FIRAuthErrorCodeInvalidRecipientEmail = 17033,
  FIRAuthErrorCodeMissingEmail = 17034,
  FIRAuthErrorCodeMissingIosBundleID = 17036,
  FIRAuthErrorCodeMissingAndroidPackageName = 17037,
  FIRAuthErrorCodeUnauthorizedDomain = 17038,
  FIRAuthErrorCodeInvalidContinueURI = 17039,
  FIRAuthErrorCodeMissingContinueURI = 17040,
  FIRAuthErrorCodeMissingPhoneNumber = 17041,
  FIRAuthErrorCodeInvalidPhoneNumber = 17042,
  FIRAuthErrorCodeMissingVerificationCode = 17043,
  FIRAuthErrorCodeInvalidVerificationCode = 17044,
  FIRAuthErrorCodeMissingVerificationID = 17045,
  FIRAuthErrorCodeInvalidVerificationID = 17046,
  FIRAuthErrorCodeMissingAppCredential = 17047,
  FIRAuthErrorCodeInvalidAppCredential = 17048,
  FIRAuthErrorCodeSessionExpired = 17051,
  FIRAuthErrorCodeQuotaExceeded = 17052,
  FIRAuthErrorCodeMissingAppToken = 17053,
  FIRAuthErrorCodeNotificationNotForwarded = 17054,
  FIRAuthErrorCodeAppNotVerified = 17055,
  FIRAuthErrorCodeCaptchaCheckFailed = 17056,
  FIRAuthErrorCodeWebContextAlreadyPresented = 17057,
  FIRAuthErrorCodeWebContextCancelled = 17058,
  FIRAuthErrorCodeAppVerificationUserInteractionFailure = 17059,
  FIRAuthErrorCodeInvalidClientID = 17060,
  FIRAuthErrorCodeWebNetworkRequestFailed = 17061,
  FIRAuthErrorCodeWebInternalError = 17062,
  FIRAuthErrorCodeWebSignInUserInteractionFailure = 17063,
  FIRAuthErrorCodeLocalPlayerNotAuthenticated = 17066,
  FIRAuthErrorCodeNullUser = 17067,
  FIRAuthErrorCodeInvalidProviderID = 17071,
  FIRAuthErrorCodeTenantIDMismatch = 17072,
  FIRAuthErrorCodeUnsupportedTenantOperation = 17073,
  FIRAuthErrorCodeInvalidHostingLinkDomain = 17214,
  FIRAuthErrorCodeRejectedCredential = 17075,
  FIRAuthErrorCodeGameKitNotLinked = 17076,
  FIRAuthErrorCodeSecondFactorRequired = 17078,
  FIRAuthErrorCodeMissingMultiFactorSession = 17081,
  FIRAuthErrorCodeMissingMultiFactorInfo = 17082,
  FIRAuthErrorCodeInvalidMultiFactorSession = 17083,
  FIRAuthErrorCodeMultiFactorInfoNotFound = 17084,
  FIRAuthErrorCodeAdminRestrictedOperation = 17085,
  FIRAuthErrorCodeUnverifiedEmail = 17086,
  FIRAuthErrorCodeSecondFactorAlreadyEnrolled = 17087,
  FIRAuthErrorCodeMaximumSecondFactorCountExceeded = 17088,
  FIRAuthErrorCodeUnsupportedFirstFactor = 17089,
  FIRAuthErrorCodeEmailChangeNeedsVerification = 17090,
  FIRAuthErrorCodeMissingClientIdentifier = 17093,
  FIRAuthErrorCodeMissingOrInvalidNonce = 17094,
  FIRAuthErrorCodeBlockingCloudFunctionError = 17105,
  FIRAuthErrorCodeRecaptchaNotEnabled = 17200,
  FIRAuthErrorCodeMissingRecaptchaToken = 17201,
  FIRAuthErrorCodeInvalidRecaptchaToken = 17202,
  FIRAuthErrorCodeInvalidRecaptchaAction = 17203,
  FIRAuthErrorCodeMissingClientType = 17204,
  FIRAuthErrorCodeMissingRecaptchaVersion = 17205,
  FIRAuthErrorCodeInvalidRecaptchaVersion = 17206,
  FIRAuthErrorCodeInvalidReqType = 17207,
  FIRAuthErrorCodeRecaptchaSDKNotLinked = 17208,
  FIRAuthErrorCodeRecaptchaSiteKeyMissing = 17209,
  FIRAuthErrorCodeRecaptchaActionCreationFailed = 17210,
  FIRAuthErrorCodeKeychainError = 17995,
  FIRAuthErrorCodeInternalError = 17999,
  FIRAuthErrorCodeMalformedJWT = 18000,
};

// ---------------------------------------------------------------------------
// MARK: - FIRUserInfo protocol
// ---------------------------------------------------------------------------

@protocol FIRUserInfo <NSObject>
@property (nonatomic, readonly, copy) NSString * _Nonnull providerID;
@property (nonatomic, readonly, copy) NSString * _Nonnull uid;
@property (nonatomic, readonly, copy) NSString * _Nullable displayName;
@property (nonatomic, readonly) NSURL * _Nullable photoURL;
@property (nonatomic, readonly, copy) NSString * _Nullable email;
@property (nonatomic, readonly, copy) NSString * _Nullable phoneNumber;
@end

// ---------------------------------------------------------------------------
// MARK: - FIRAuthCredential
// ---------------------------------------------------------------------------

@interface FIRAuthCredential : NSObject
@property (nonatomic, readonly, copy) NSString * _Nonnull provider;
@end

// ---------------------------------------------------------------------------
// MARK: - FIROAuthCredential
// ---------------------------------------------------------------------------

@interface FIROAuthCredential : FIRAuthCredential <NSSecureCoding>
@property (nonatomic, readonly, copy) NSString * _Nullable IDToken;
@property (nonatomic, readonly, copy) NSString * _Nullable accessToken;
@property (nonatomic, readonly, copy) NSString * _Nullable secret;
+ (FIROAuthCredential * _Nonnull)credentialWithProviderID:(NSString * _Nonnull)providerID
                                                  IDToken:(NSString * _Nonnull)IDToken
                                              accessToken:(NSString * _Nullable)accessToken;
+ (FIROAuthCredential * _Nonnull)credentialWithProviderID:(NSString * _Nonnull)providerID
                                              accessToken:(NSString * _Nonnull)accessToken;
+ (FIROAuthCredential * _Nonnull)credentialWithProviderID:(NSString * _Nonnull)providerID
                                                  IDToken:(NSString * _Nonnull)IDToken
                                                 rawNonce:(NSString * _Nonnull)rawNonce
                                              accessToken:(NSString * _Nullable)accessToken;
+ (FIROAuthCredential * _Nonnull)credentialWithProviderID:(NSString * _Nonnull)providerID
                                                  IDToken:(NSString * _Nonnull)IDToken
                                                 rawNonce:(NSString * _Nonnull)rawNonce;
@end

// ---------------------------------------------------------------------------
// MARK: - FIRPhoneAuthCredential
// ---------------------------------------------------------------------------

@interface FIRPhoneAuthCredential : FIRAuthCredential <NSSecureCoding>
@end

// ---------------------------------------------------------------------------
// MARK: - FIRAuthSettings
// ---------------------------------------------------------------------------

@interface FIRAuthSettings : NSObject <NSCopying>
@property (nonatomic) BOOL appVerificationDisabledForTesting;
@property (nonatomic) BOOL isAppVerificationDisabledForTesting;
@end

// ---------------------------------------------------------------------------
// MARK: - FIRAuthTokenResult
// ---------------------------------------------------------------------------

@interface FIRAuthTokenResult : NSObject
@property (nonatomic, copy) NSString * _Nonnull token;
@property (nonatomic, copy) NSDate * _Nonnull expirationDate;
@property (nonatomic, copy) NSDate * _Nonnull authDate;
@property (nonatomic, copy) NSDate * _Nonnull issuedAtDate;
@property (nonatomic, copy) NSString * _Nonnull signInProvider;
@property (nonatomic, copy) NSString * _Nonnull signInSecondFactor;
@property (nonatomic, copy) NSDictionary<NSString *, id> * _Nonnull claims;
@end

// ---------------------------------------------------------------------------
// MARK: - FIRAdditionalUserInfo
// ---------------------------------------------------------------------------

@interface FIRAdditionalUserInfo : NSObject
@property (nonatomic, readonly, copy) NSString * _Nonnull providerID;
@property (nonatomic, readonly) NSDictionary<NSString *, id> * _Nullable profile;
@property (nonatomic, readonly, copy) NSString * _Nullable username;
@property (nonatomic, readonly) BOOL isNewUser;
@end

// ---------------------------------------------------------------------------
// MARK: - FIRUserMetadata
// ---------------------------------------------------------------------------

@interface FIRUserMetadata : NSObject
@property (nonatomic, readonly) NSDate * _Nullable lastSignInDate;
@property (nonatomic, readonly) NSDate * _Nullable creationDate;
@end

// ---------------------------------------------------------------------------
// MARK: - FIRUserProfileChangeRequest
// ---------------------------------------------------------------------------

@interface FIRUserProfileChangeRequest : NSObject
@property (nonatomic, copy) NSString * _Nullable displayName;
@property (nonatomic, copy) NSURL * _Nullable photoURL;
- (void)commitChangesWithCompletion:(void (^ _Nullable)(NSError * _Nullable))completion;
@end

// ---------------------------------------------------------------------------
// MARK: - MultiFactor types (iOS only)
// ---------------------------------------------------------------------------

#if TARGET_OS_IOS

@interface FIRMultiFactorInfo : NSObject
@property (nonatomic, readonly, copy) NSString * _Nonnull uid;
@property (nonatomic, readonly, copy) NSString * _Nullable displayName;
@property (nonatomic, readonly) NSDate * _Nonnull enrollmentDate;
@property (nonatomic, readonly, copy) NSString * _Nonnull factorID;
@end

@interface FIRPhoneMultiFactorInfo : FIRMultiFactorInfo
@property (class, nonatomic, readonly, copy) NSString * _Nonnull PhoneMultiFactorID;
@property (class, nonatomic, readonly, copy) NSString * _Nonnull TOTPMultiFactorID;
@property (nonatomic, readonly, copy) NSString * _Nonnull phoneNumber;
@end

@interface FIRMultiFactorSession : NSObject
@end

@interface FIRMultiFactorAssertion : NSObject
@property (nonatomic, copy) NSString * _Nonnull factorID;
@end

@interface FIRPhoneMultiFactorAssertion : FIRMultiFactorAssertion
@end

@interface FIRPhoneMultiFactorGenerator : NSObject
+ (FIRPhoneMultiFactorAssertion * _Nonnull)assertionWithCredential:(FIRPhoneAuthCredential * _Nonnull)credential;
@end

@interface FIRTOTPMultiFactorAssertion : FIRMultiFactorAssertion
@end

@interface FIRTOTPSecret : NSObject
- (NSString * _Nonnull)generateQRCodeURLWithAccountName:(NSString * _Nonnull)accountName
                                                 issuer:(NSString * _Nonnull)issuer;
- (void)openInOTPAppWithQRCodeURL:(NSString * _Nonnull)qrCodeURL;
@end

@interface FIRTOTPMultiFactorGenerator : NSObject
+ (void)generateSecretWithMultiFactorSession:(FIRMultiFactorSession * _Nonnull)session
                                  completion:(void (^ _Nonnull)(FIRTOTPSecret * _Nullable, NSError * _Nullable))completion;
+ (FIRTOTPMultiFactorAssertion * _Nonnull)assertionForEnrollmentWithSecret:(FIRTOTPSecret * _Nonnull)secret
                                                           oneTimePassword:(NSString * _Nonnull)oneTimePassword;
+ (FIRTOTPMultiFactorAssertion * _Nonnull)assertionForSignInWithEnrollmentID:(NSString * _Nonnull)enrollmentID
                                                             oneTimePassword:(NSString * _Nonnull)oneTimePassword;
@end

@interface FIRMultiFactor : NSObject
@property (nonatomic, copy) NSArray<FIRMultiFactorInfo *> * _Nonnull enrolledFactors;
- (void)getSessionWithCompletion:(void (^ _Nonnull)(FIRMultiFactorSession * _Nullable, NSError * _Nullable))completion;
- (void)enrollWithAssertion:(FIRMultiFactorAssertion * _Nonnull)assertion
               displayName:(NSString * _Nullable)displayName
                completion:(void (^ _Nonnull)(NSError * _Nullable))completion;
- (void)unenrollWithInfo:(FIRMultiFactorInfo * _Nonnull)factorInfo
              completion:(void (^ _Nonnull)(NSError * _Nullable))completion;
- (void)unenrollWithFactorUID:(NSString * _Nonnull)factorUID
                   completion:(void (^ _Nonnull)(NSError * _Nullable))completion;
@end

@interface FIRMultiFactorResolver : NSObject
@property (nonatomic, readonly) FIRMultiFactorSession * _Nonnull session;
@property (nonatomic, readonly, copy) NSArray<FIRMultiFactorInfo *> * _Nonnull hints;
@property (nonatomic, readonly) FIRAuth * _Nonnull auth;
- (void)resolveSignInWithAssertion:(FIRMultiFactorAssertion * _Nonnull)assertion
                        completion:(void (^ _Nullable)(FIRAuthDataResult * _Nullable, NSError * _Nullable))completion;
@end

#endif  // TARGET_OS_IOS

// ---------------------------------------------------------------------------
// MARK: - FIRUser
// ---------------------------------------------------------------------------

@interface FIRUser : NSObject <FIRUserInfo>
@property (nonatomic, readonly) BOOL isAnonymous;
@property (nonatomic, readonly) BOOL isEmailVerified;
@property (nonatomic, readonly, copy) NSArray<id<FIRUserInfo>> * _Nonnull providerData;
@property (nonatomic, readonly) FIRUserMetadata * _Nonnull metadata;
@property (nonatomic, readonly, copy) NSString * _Nullable tenantID;
@property (nonatomic, readonly, copy) NSString * _Nullable refreshToken;
#if TARGET_OS_IOS
@property (nonatomic, readonly) FIRMultiFactor * _Nonnull multiFactor;
#endif

- (void)updateEmail:(NSString * _Nonnull)email
         completion:(void (^ _Nullable)(NSError * _Nullable))completion;
- (void)updatePassword:(NSString * _Nonnull)password
            completion:(void (^ _Nullable)(NSError * _Nullable))completion;
- (FIRUserProfileChangeRequest * _Nonnull)profileChangeRequest;
- (void)reloadWithCompletion:(void (^ _Nullable)(NSError * _Nullable))completion;
- (void)sendEmailVerificationWithCompletion:(void (^ _Nullable)(NSError * _Nullable))completion;
- (void)sendEmailVerificationBeforeUpdatingEmail:(NSString * _Nonnull)email
                                      completion:(void (^ _Nullable)(NSError * _Nullable))completion;
- (void)deleteWithCompletion:(void (^ _Nullable)(NSError * _Nullable))completion;
- (void)getIDTokenWithCompletion:(void (^ _Nullable)(NSString * _Nullable, NSError * _Nullable))completion;
- (void)getIDTokenForcingRefresh:(BOOL)forceRefresh
                      completion:(void (^ _Nullable)(NSString * _Nullable, NSError * _Nullable))completion;
- (void)getIDTokenResultWithCompletion:(void (^ _Nullable)(FIRAuthTokenResult * _Nullable, NSError * _Nullable))completion;
- (void)getIDTokenResultForcingRefresh:(BOOL)forceRefresh
                            completion:(void (^ _Nullable)(FIRAuthTokenResult * _Nullable, NSError * _Nullable))completion;
- (void)reauthenticateWithCredential:(FIRAuthCredential * _Nonnull)credential
                          completion:(void (^ _Nullable)(FIRAuthDataResult * _Nullable, NSError * _Nullable))completion;
- (void)linkWithCredential:(FIRAuthCredential * _Nonnull)credential
                completion:(void (^ _Nullable)(FIRAuthDataResult * _Nullable, NSError * _Nullable))completion;
- (void)unlinkFromProvider:(NSString * _Nonnull)provider
                completion:(void (^ _Nullable)(FIRUser * _Nullable, NSError * _Nullable))completion;
#if TARGET_OS_IOS
- (void)updatePhoneNumberCredential:(FIRPhoneAuthCredential * _Nonnull)phoneNumberCredential
                         completion:(void (^ _Nullable)(NSError * _Nullable))completion;
#endif
@end

// ---------------------------------------------------------------------------
// MARK: - FIRAuthDataResult
// ---------------------------------------------------------------------------

@interface FIRAuthDataResult : NSObject
@property (nonatomic, readonly) FIRUser * _Nonnull user;
@property (nonatomic, readonly) FIRAdditionalUserInfo * _Nullable additionalUserInfo;
@property (nonatomic, readonly) FIROAuthCredential * _Nullable credential;
@end

// ---------------------------------------------------------------------------
// MARK: - FIRAuth
// ---------------------------------------------------------------------------

@interface FIRAuth : NSObject
+ (FIRAuth * _Nonnull)auth;
+ (FIRAuth * _Nonnull)authWithApp:(FIRApp * _Nonnull)app;
@property (nonatomic, weak) FIRApp * _Nullable app;
@property (nonatomic, readonly) FIRUser * _Nullable currentUser;
@property (nonatomic, copy) NSString * _Nullable languageCode;
@property (nonatomic, copy) FIRAuthSettings * _Nullable settings;
@property (nonatomic, readonly) NSString * _Nullable userAccessGroup;
@property (nonatomic) BOOL shareAuthStateAcrossDevices;
@property (nonatomic, copy) NSString * _Nullable tenantID;
@property (nonatomic, copy) NSString * _Nullable customAuthDomain;

- (void)updateCurrentUser:(FIRUser * _Nullable)user
               completion:(void (^ _Nullable)(NSError * _Nullable))completion;
- (void)fetchSignInMethodsForEmail:(NSString * _Nonnull)email
                        completion:(void (^ _Nullable)(NSArray<NSString *> * _Nullable, NSError * _Nullable))completion;
- (void)signInWithEmail:(NSString * _Nonnull)email
               password:(NSString * _Nonnull)password
             completion:(void (^ _Nullable)(FIRAuthDataResult * _Nullable, NSError * _Nullable))completion;
- (void)signInWithEmail:(NSString * _Nonnull)email
                   link:(NSString * _Nonnull)link
             completion:(void (^ _Nullable)(FIRAuthDataResult * _Nullable, NSError * _Nullable))completion;
- (void)signInWithCredential:(FIRAuthCredential * _Nonnull)credential
                  completion:(void (^ _Nullable)(FIRAuthDataResult * _Nullable, NSError * _Nullable))completion;
- (void)signInAnonymouslyWithCompletion:(void (^ _Nullable)(FIRAuthDataResult * _Nullable, NSError * _Nullable))completion;
- (void)signInWithCustomToken:(NSString * _Nonnull)token
                   completion:(void (^ _Nullable)(FIRAuthDataResult * _Nullable, NSError * _Nullable))completion;
- (void)createUserWithEmail:(NSString * _Nonnull)email
                   password:(NSString * _Nonnull)password
                 completion:(void (^ _Nullable)(FIRAuthDataResult * _Nullable, NSError * _Nullable))completion;
- (void)confirmPasswordResetWithCode:(NSString * _Nonnull)code
                         newPassword:(NSString * _Nonnull)newPassword
                          completion:(void (^ _Nonnull)(NSError * _Nullable))completion;
- (void)checkActionCode:(NSString * _Nonnull)code
             completion:(void (^ _Nonnull)(id _Nullable, NSError * _Nullable))completion;
- (void)verifyPasswordResetCode:(NSString * _Nonnull)code
                     completion:(void (^ _Nonnull)(NSString * _Nullable, NSError * _Nullable))completion;
- (void)applyActionCode:(NSString * _Nonnull)code
             completion:(void (^ _Nonnull)(NSError * _Nullable))completion;
- (void)sendPasswordResetWithEmail:(NSString * _Nonnull)email
                        completion:(void (^ _Nullable)(NSError * _Nullable))completion;
- (void)sendPasswordResetWithEmail:(NSString * _Nonnull)email
                actionCodeSettings:(id _Nonnull)settings
                        completion:(void (^ _Nullable)(NSError * _Nullable))completion;
- (void)sendSignInLinkToEmail:(NSString * _Nonnull)email
           actionCodeSettings:(id _Nonnull)settings
                   completion:(void (^ _Nullable)(NSError * _Nullable))completion;
- (BOOL)signOut:(NSError * _Nullable * _Nullable)error;
- (BOOL)isSignInWithEmailLink:(NSString * _Nonnull)link;
- (id<NSObject> _Nonnull)addAuthStateDidChangeListener:(void (^ _Nonnull)(FIRAuth * _Nonnull, FIRUser * _Nullable))listener;
- (void)removeAuthStateDidChangeListener:(id<NSObject> _Nonnull)listenerHandle;
- (id<NSObject> _Nonnull)addIDTokenDidChangeListener:(void (^ _Nonnull)(FIRAuth * _Nonnull, FIRUser * _Nullable))listener;
- (void)removeIDTokenDidChangeListener:(id<NSObject> _Nonnull)listenerHandle;
- (void)useAppLanguage;
- (void)useEmulatorWithHost:(NSString * _Nonnull)host port:(NSInteger)port;
- (BOOL)useUserAccessGroup:(NSString * _Nullable)userAccessGroup error:(NSError * _Nullable * _Nullable)outError;
- (void)revokeTokenWithAuthorizationCode:(NSString * _Nonnull)authorizationCode
                              completion:(void (^ _Nullable)(NSError * _Nullable))completion;
- (void)initializeRecaptchaConfigWithCompletion:(void (^ _Nullable)(NSError * _Nullable))completion;
#if TARGET_OS_IOS
@property (nonatomic) NSData * _Nullable APNSToken;
- (void)setAPNSToken:(NSData * _Nonnull)token type:(NSInteger)type;
- (BOOL)canHandleNotification:(NSDictionary<NSString *, id> * _Nonnull)userInfo;
- (BOOL)canHandleURL:(NSURL * _Nonnull)url;
#endif
@end

// ---------------------------------------------------------------------------
// MARK: - FIRPhoneAuthProvider
// ---------------------------------------------------------------------------

#if TARGET_OS_IOS
@interface FIRPhoneAuthProvider : NSObject
@property (class, nonatomic, readonly, copy) NSString * _Nonnull id;
+ (FIRPhoneAuthProvider * _Nonnull)provider;
+ (FIRPhoneAuthProvider * _Nonnull)providerWithAuth:(FIRAuth * _Nonnull)auth;
- (void)verifyPhoneNumber:(NSString * _Nonnull)phoneNumber
               UIDelegate:(id _Nullable)UIDelegate
               completion:(void (^ _Nullable)(NSString * _Nullable, NSError * _Nullable))completion;
- (void)verifyPhoneNumber:(NSString * _Nonnull)phoneNumber
               UIDelegate:(id _Nullable)UIDelegate
       multiFactorSession:(FIRMultiFactorSession * _Nullable)session
               completion:(void (^ _Nullable)(NSString * _Nullable, NSError * _Nullable))completion;
- (void)verifyPhoneNumberWithMultiFactorInfo:(FIRPhoneMultiFactorInfo * _Nonnull)multiFactorInfo
                                  UIDelegate:(id _Nullable)UIDelegate
                          multiFactorSession:(FIRMultiFactorSession * _Nullable)session
                                  completion:(void (^ _Nullable)(NSString * _Nullable, NSError * _Nullable))completion;
- (FIRPhoneAuthCredential * _Nonnull)credentialWithVerificationID:(NSString * _Nonnull)verificationID
                                                 verificationCode:(NSString * _Nonnull)verificationCode;
@end
#endif  // TARGET_OS_IOS

// ---------------------------------------------------------------------------
// MARK: - FIROAuthProvider
// ---------------------------------------------------------------------------

@interface FIROAuthProvider : NSObject
@property (class, nonatomic, readonly, copy) NSString * _Nonnull id;
@property (nonatomic, copy) NSArray<NSString *> * _Nullable scopes;
@property (nonatomic, copy) NSDictionary<NSString *, NSString *> * _Nullable customParameters;
@property (nonatomic, readonly, copy) NSString * _Nonnull providerID;
+ (FIROAuthProvider * _Nonnull)providerWithProviderID:(NSString * _Nonnull)providerID;
+ (FIROAuthProvider * _Nonnull)providerWithProviderID:(NSString * _Nonnull)providerID
                                                 auth:(FIRAuth * _Nonnull)auth;
+ (FIROAuthCredential * _Nonnull)credentialWithProviderID:(NSString * _Nonnull)providerID
                                                  IDToken:(NSString * _Nonnull)IDToken
                                              accessToken:(NSString * _Nullable)accessToken;
+ (FIROAuthCredential * _Nonnull)credentialWithProviderID:(NSString * _Nonnull)providerID
                                              accessToken:(NSString * _Nonnull)accessToken;
+ (FIROAuthCredential * _Nonnull)credentialWithProviderID:(NSString * _Nonnull)providerID
                                                  IDToken:(NSString * _Nonnull)IDToken
                                                 rawNonce:(NSString * _Nonnull)rawNonce
                                              accessToken:(NSString * _Nullable)accessToken;
+ (FIROAuthCredential * _Nonnull)credentialWithProviderID:(NSString * _Nonnull)providerID
                                                  IDToken:(NSString * _Nonnull)IDToken
                                                 rawNonce:(NSString * _Nonnull)rawNonce;
@end

#endif  // __OBJC__
