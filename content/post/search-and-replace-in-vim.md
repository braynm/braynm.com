---
title: "Using Vim Substitute"
date: 2023-07-22T14:46:55+08:00
draft: false
hero: "/images/IMG_7774.jpg"
excerpt: Exploring search and replace in Vim
authors:
  - Bryan Madrid
---

# Search and Replace in Vim

In this article, we will explore how to use Vim's **search** and **replace** that *may* help us to edit efficiently.

**Note:** This article required a basic understanding of regular expression.


Let's begin!


## Basic

See `:help substitute` to read documentation. The basic syntax for replacing text is:

```vim
# Replaces `hello` with `world`
:s/hello/world

# hello -> world
```


Here is another example of changing delimiter of `csv` file from **`,`** to **`t`**

change delimiter:
{{< video width="100%" height="20" src="/videos/blog-video-1.mp4" type="video/mp4" preload="auto" >}}

## Capitalizing Words

You might think, I can just type it manually since there are only 4 words. What
if there are **thousands** of rows. We will **not** *edit* manually. It will be time consuming.

So here comes the `substite` comes handy. It support patterns to make things *easier*.


Capitalize words on every row:
{{< video width="100%" height="20" src="/videos/blog-video-2.mp4" type="video/mp4" preload="auto" >}}

Pretty neat!

Let's break down the command:

```vim
:%s/\a\+/\u&/g
```
* `%s` - Targets all the lines in the file to perform substitution.
* `\a` - Matches alphabetic character.
* `\+` - Matches 1 or more of the preceding atom, as many as possible.
* `\u` - Uppercase the match.
* `&` - Reuse the flags from the previous substitute command.
* `g` - Replace all matches in the line.

This can be more clear by using `magic` mode, by adding `\v` in front of `{pattern}` 

```vim
:%s/\v\a+/\u&/g
```

This is helpful when your pattern is long, it makes the pattern more **readable**. To learn more about `magic` you can use `:help magic` in Vim.


# Name Initials

We can also make name initials: `Michael Scott -> M. Scott or M.S.`

```vim
%s/\v(<.)(\a+)/\u\1.
```

{{< video width="100%" height="20" src="/videos/blog-video-2.1.mp4" type="video/mp4" preload="auto" >}}

## Swapping Words

Let's say we need to change the formatting of name, we need to follow this format: `Last Name, First Name`. We can use captures to do this.

{{< video width="100%" height="20" src="/videos/blog-video-3.mp4" type="video/mp4" preload="auto" >}}

## Using Registers

So first, what is `"register"` in Vim?

> Is a storage space where text can be yanked (copied) or put (pasted). It's like a clipboard or buffer where you can temporarily store pieces of text. Registers allow you to manipulate and transfer text in various ways within Vim.


You can open your register by running  `:registers`

So we have list of places:

```csv
Yamagawaokachiyogamizu
Eexterveenschekanaal
Jászfelsőszentgyörgy
```

We need to replace **Yamagawaokachiyogamizu** with **Jászfelsőszentgyörgy**:
{{< video width="100%" height="20" src="/videos/blog-video-4.mp4" type="video/mp4" preload="auto" >}}


Let's see what's happening step-by-step:

- Select Yamagawaokachiyogamizu
- Save `Yamagawaokachiyogamizu` to **`"a`** register
- Save `Jászfelsőszentgyörgy` to **`"b`** register
- Run substitute command: `%:s/<C-r>a/<C-r>b`

`<C-r> {register} (e.g. <C-r>b)` — Insert the contents of a numbered or named register.

This will translates to:

```vim
:%s/Eexterveenschekanaal/Jászfelsőszentgyörgy
```

This is nice! Fewer keystroke! We don't have to type these long words manually! It might save you lot of time for some typographical errors.

## Summary

* Efficient Text Editing: Vim's substitute command (:s) allows you to replace specific occurrences of text throughout your document fast and accurately.
* Targeted replacements: With various search patterns and flags, you can perform precise and targeted replacements, avoiding unintended changes.
* Backreferences: Leveraging backreferences (\1, \2, etc.), you can refer to captured groups in your search pattern and use them in the replacement, facilitating dynamic and personalized substitutions.
* Time-saving Editing Workflow: With the flexibility and power of Vim's substitute command, you can optimize your editing workflow, saving time and increasing productivity in your daily text-editing tasks.


We learned that `substite` is a powerful tool. Mastering regex can be hard, I personally use [regexr](https://regexr.com/) when dealing with regex patterns. It break down patterns with each explanation on what it does.

That's all for now.

Thanks!
