### Waiting on a child is not one of them

Dispatch is **non-blocking**, and this was measured with a two-level probe
rather than inferred. The Agent tool returns in about a second with an id and no
result. Roughly sixty seconds later, when the child finished, the runtime
re-invoked the parent on its own and delivered the result then, with no human
and no other session involved.

**Two consequences, and they pull in opposite directions.**

You are safe. Ending a turn with a child outstanding does not strand you: its
completion wakes you. So do not poll, do not sleep, and do not invent a bounded
wait.

You are also idle. The wake comes when the child finishes, which means every
minute it runs is a minute you spent doing nothing, and a thirteen-task plan run
one child at a time is thirteen serial waits. That is the real cost, and it is
not a safety problem, it is a throughput one.

So while a child is outstanding, prefer to have your last tool call be one of:

1. **The next task on the frontier.** Reviews and independent tasks may run
   while an implementer works. The frontier usually has something.
2. **A read of a report file that has already landed.** The report file is the
   return channel, not a message from the child. Check for it.
3. **Ledger work**: the ruling you just made, the review package for the task in
   flight, the next dispatch prompt.

When the frontier is genuinely empty and every remaining task blocks on the
outstanding child, ending the turn is correct and safe. Write one ledger line
naming what you are blocked on, so that a later reader can tell a deliberate
wait from a stall. **The ledger line is the whole difference between the two**,
because from the outside they look identical.

### A long command is not a child, and this is where builds actually stall

A suite that runs for tens of minutes outlasts any foreground call, so it gets
launched in the background. **A background command wakes you only if the
harness is tracking it.** A process you started some other way, a container
left running, a shell that detached, is invisible: it finishes and nothing
happens, and the turn already ended.

**So make the thing you wait on the thing the harness tracks.** Launch the run
as a tracked background command and end the turn on it. When you can only reach
the work indirectly, as with a container started elsewhere, launch a tracked
command whose own exit is the signal you need:

```
docker logs -f <container> > <logfile> 2>&1; echo SUITE_EXITED
```

That follower exits when the container does, it is tracked, and it preserves
the output you were going to need anyway.

**The tell that you are in this failure:** you are about to end a turn saying
you are waiting, and you cannot name the tracked thing that will wake you. Then
you are not waiting, you have stopped.

The stall this section guards against is the other one: ending a turn with
**nothing outstanding at all**. Nothing will wake you then, because nothing is
running. That is what "Rulings, not stalls" above is about, and it is the case
where a plan quietly stops at task 2 of 13.

**Waiting on dispatched subagents.** Never poll with short timeouts. While local
work remains (ledger updates, the next review package, reading reports) keep
working; results arrive on their own. There is no bounded-wait option: see
"Waiting on a child is not one of them" above. Dispatch is asynchronous, so a
message that ends with nothing queued ends your turn until something external
wakes you, and a controller that believed it was waiting has in fact stopped.
