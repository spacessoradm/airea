import { Link } from "wouter";
import { Mail, Phone, MapPin, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ContactUs() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Contact Us</h1>
          <p className="text-gray-600 mt-2">Get in touch with our team. We're here to help you find your perfect property.</p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Information */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Contact Information</h2>
            
            <div className="space-y-6">
              {/* Email */}
              <Card className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <Mail className="h-6 w-6 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                    <a 
                      href="mailto:hello@airea.my" 
                      className="text-gray-600 hover:text-gray-900 transition-colors"
                      data-testid="link-email"
                    >
                      hello@airea.my
                    </a>
                    <p className="text-sm text-gray-500 mt-1">For general inquiries and support</p>
                  </div>
                </div>
              </Card>

              {/* Phone */}
              <Card className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <Phone className="h-6 w-6 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                    <a 
                      href="tel:+60321234567" 
                      className="text-gray-600 hover:text-gray-900 transition-colors"
                      data-testid="link-phone"
                    >
                      +60 3-2123 4567
                    </a>
                    <p className="text-sm text-gray-500 mt-1">Monday to Friday, 9:00 AM - 6:00 PM</p>
                  </div>
                </div>
              </Card>

              {/* Office Location */}
              <Card className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <MapPin className="h-6 w-6 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Office</h3>
                    <p className="text-gray-600" data-testid="text-address">
                      Level 10, Menara Airea<br />
                      Jalan Ampang<br />
                      50450 Kuala Lumpur<br />
                      Malaysia
                    </p>
                  </div>
                </div>
              </Card>

              {/* Business Hours */}
              <Card className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <Clock className="h-6 w-6 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Business Hours</h3>
                    <div className="text-gray-600 space-y-1" data-testid="text-hours">
                      <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                      <p>Saturday: 10:00 AM - 3:00 PM</p>
                      <p>Sunday & Public Holidays: Closed</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Send us a Message</h2>
            <Card className="p-6">
              <form className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    data-testid="input-name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    data-testid="input-email"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    data-testid="input-phone"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    data-testid="input-subject"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                    data-testid="input-message"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                  data-testid="button-submit"
                >
                  Send Message
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  We'll get back to you within 1-2 business days
                </p>
              </form>
            </Card>
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">For Agents</h3>
          <p className="text-gray-600 mb-4">
            Are you a property agent looking to list properties on Airea? 
            Please visit our <Link href="/agent/login" className="text-gray-900 underline hover:text-gray-700">Agent Portal</Link> to get started.
          </p>
          <p className="text-gray-600">
            For agent support and inquiries, contact us at <a href="mailto:agents@airea.my" className="text-gray-900 underline hover:text-gray-700">agents@airea.my</a>
          </p>
        </div>
      </div>
    </div>
  );
}
