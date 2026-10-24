---
title: How I Ended Up Building My Own Investing App
date: 2026-10-24T09:00:00+08:00
excerpt: From MP2 and Philippine REITs to Interactive Brokers, and the app I built to make sense of it all.
description: How learning about money for my family led from Pag-IBIG MP2 and Philippine REITs to Interactive Brokers, and to building IBKR Screener, my own investing app.
---

I only started taking personal finance seriously in my 30s. I was starting a family, and having a child made me think more about what I should be doing with my money. I wanted to save for our future. The problem was, I didn’t know much beyond keeping money in a savings account.

So I watched videos on YouTube and Facebook. That’s where I learned about Pag-IBIG MP2 and eventually tried it. Then I got interested in Philippine REITs, particularly RCR and AREIT. Now I had more things to learn: dividends, share prices, company disclosures. There was a lot to catch up on.

At some point I started wondering if I could buy US stocks from the Philippines. I looked into brokers, how to fund an account, and the fees involved. That led me to Interactive Brokers.

My first time opening IBKR was confusing. So many panels and settings, and I was still learning what the different order types meant. Getting an account was one thing. Figuring out what to do inside it took more work.

While learning all this, I wanted to put the information I was looking at in one place, arranged in a way I could follow. And since I’m a developer, I ended up building an app for it. Another personal project 😅

I call it IBKR Screener. It’s private, just something I’m building for my own use, connected to my Interactive Brokers account.

I can look through companies in the S&P 500 and Nasdaq-100, compare sectors, and check revenue, profitability, and valuation. There’s also a place to read SEC filings, including financial results, offerings, and ownership changes. I’m learning what to look for in those documents as I go.

For charts, I can switch timeframes, look at price and volume, mark levels, and put views side by side. The app also lets me send orders to IBKR and check their status alongside my positions.

I’ve added news and a journal too. I want to be able to go back to a decision later and see what I was thinking when I made it.

The stack is Elixir, Phoenix LiveView, and PostgreSQL. LiveView handles updating the screens when market data comes in, with the IBKR integration connecting the app to my broker.

Claude Code has been a big help with the development. I’ve been using this project to explore what I can build with it, and covering this much on my own would have taken much longer. I still have to understand the code and check that it does what I expect.

One thing I like about building this for myself: when something takes too many steps, I can change it. If I keep looking for the same information, I can move it somewhere easier to find.

I’m still learning about investing. For now, I have an app to work on alongside that. I didn’t expect learning about MP2 to lead to writing an IBKR integration, but here we are.
