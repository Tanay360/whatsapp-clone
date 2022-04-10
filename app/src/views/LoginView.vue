<script lang="ts">
    export const useNumber = defineStore('phoneNumber', {
        state() {
            return {
                phone: '',
                country: '91',
                showInput: true,
            }
        },
        actions: {
            updatePhone(phone: string) {
                this.phone = phone;
            },
            updateCountry({dialCode}: {dialCode: string}) {
                this.country = dialCode;
            },
            hideInput() {
                this.showInput = false;
            },
            startInput() {
                this.showInput = true;
            }
        }
    })

    export const useOtp = defineStore('otp', {
        state() {
            return {
                otp: ''
            }
        },
        actions: {
            updateOtp(otp: string) {
                this.otp = otp;
            }
        }
    })

</script>

<script lang="ts" setup>
    import WhatsApp from '@/components/WhatsApp.vue';
    import { getAuth, signInWithPhoneNumber, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
    import { defineStore } from 'pinia';
    import Vue from 'vue';

    const auth = getAuth()
    const phoneNumber = useNumber();
    const otpNumber = useOtp();
    const numberChange = (value: string | undefined) => {
        phoneNumber.updatePhone(value || '');
    }

    let signResult: ConfirmationResult | null = null;

    const signIn = async () => {
        const recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
            'size': 'normal',
            'callback': (response: any) => {
                console.error(`+${phoneNumber.country}${phoneNumber.phone}`);
                phoneNumber.hideInput();
            },
            'expired-callback': () => {
                // Response expired. Ask user to solve reCAPTCHA again.
                // ...
            }
            }, auth);
        signResult = await signInWithPhoneNumber(auth, `+${phoneNumber.country}${phoneNumber.phone}`, recaptchaVerifier);
    }

    const changeOtp = (otp: string) => {
        otpNumber.updateOtp(otp)
    }

    const confirmOtp = async () => {
        if (otpNumber.otp.length < 6) {
            Vue.$toast.error('Re-enter otp!', {
                message: 'Re-enter otp!',
                position: 'top-right'
            })
        } else {
            if (signResult != null) {
                await signResult.confirm(otpNumber.otp)
                Vue.$toast.success('Signed in successfully!', {
                    message: 'Signed in successfully!',
                    position: 'top-right'
                });
                setTimeout(() => {
                    window.open('/', '_self')
                }, 1000);
            } else {
                Vue.$toast.error('Some error occurred, please try again!', {
                    message: 'Some error occurred, please try again!',
                    position: 'top-right'
                })
                phoneNumber.startInput()
            }
        }
    }

    const continueToOtp = () => {
        if (phoneNumber.phone.match(/^\d+$/)?.join('') != phoneNumber.phone) {
            Vue.$toast.error('Please enter your number correctly', {
                message: 'Please enter your number correctly',
                position: 'top-right'
            })
        } else {
            signIn()
            // phoneNumber.hideInput();
        }
    }

    let country = 'India'
</script>

<template>
    <main>
        <v-app-bar
          elevation="4"
          dark
        >
          <v-app-bar-nav-icon><WhatsApp style="width: 30px; height: 30px;"/></v-app-bar-nav-icon>
          <v-app-bar-title>WhatsApp Clone</v-app-bar-title>
        </v-app-bar>

        <div class="number-cont">
            <v-card v-if="phoneNumber.showInput" dark style="padding: 1rem; padding-bottom: 2rem; min-width: 50%; background: #333; border-radius: 10px;">
                <div style="display: flex; flex-direction: column;">
                    <v-card-title>Enter your phone number</v-card-title>
                    <v-row>
                       <vue-country-code
                            style="color: black; margin-right: 10px;"
                            @onSelect="(data) => {
                                phoneNumber.updateCountry(data)
                            }"
                        />
                    <v-text-field
                        dark
                        filled
                        hide-details
                        single-line
                        type="number"
                        @change="numberChange"
                        label="Phone Number"
                        prepend-inner-icon="mdi-phone"
                    ></v-text-field> 
                    </v-row>
                       
                    <div id="recaptcha-container" style="margin-top: 20px;"></div>
                    <v-btn text class="c-green mt-8" style="align-self: flex-end; margin-top: 20px;" @click="continueToOtp">Continue <v-icon>mdi-arrow-right</v-icon></v-btn>
                </div>
            </v-card>
            <v-card v-else dark style="padding: 2rem; max-width: 50%; background: #333; border-radius: 10px;">
                <v-btn fab depressed @click="phoneNumber.startInput">
                    <v-icon>mdi-arrow-left</v-icon>
                </v-btn>
                
                <v-card-title>Enter the OTP you received</v-card-title>
                <v-otp-input length="6" style="max-width: 70%" @change="changeOtp"></v-otp-input>
                <v-btn outlined style="float: right;" @click="confirmOtp">Confirm</v-btn>
            </v-card>
        </div>
    </main>
</template>

<style scoped>
    .number-cont {
        min-height: 80vh;
        padding: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }
</style>

<style>
    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    .mt-8 {
        margin-top: 8px;
    }
    /* Firefox */
    input[type=number] {
        -moz-appearance: textfield;
    }

    .c-green {
        color: aquamarine !important;
    }
</style>