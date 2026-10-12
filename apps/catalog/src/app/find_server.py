"""Legacy compatibility: launch the reconnecting client instead of prompting for IP."""
from windows.connection_agent import start
if __name__=='__main__':start()
